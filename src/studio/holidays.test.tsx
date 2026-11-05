/**
 * @vitest-environment jsdom
 *
 * "ADD AS A CLOSURE", FROM HOLIDAY CALENDARS: the coming public holidays for
 * the studio's country on the Machines screen, each a tap from being a
 * closure; one already added says so; nobody sees any of it without the
 * add-on, its days, or the right to add a closure. And the door: which
 * holidays it reads and the row it writes.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { I18nProvider } from "../i18n/index.tsx";
import { AdminiumStudio } from "./adminiumStudio.ts";
import { StudioProvider, type StudioEnv } from "./env.tsx";
import { comingHolidays, holidayClosure, holidayPlace } from "./holidays.ts";
import { StudioApp } from "./StudioApp.tsx";
import { useStudio } from "./store.ts";
import { FakeDoor } from "./testing/fakeDoor.ts";
import { fixture, THURSDAY, UK_HOLIDAYS } from "./testing/fixture.ts";
import type { StaffConfig } from "./transport/staffConnection.ts";
import { SessionPortError, type SessionTransport } from "./transport/sessionSource.ts";
import type { Row } from "./wire.ts";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let host: HTMLElement;
const INITIAL = useStudio.getState();

beforeEach(() => {
  useStudio.setState({ ...INITIAL, toasts: [], overlay: null, data: null, failure: null });
  host = document.createElement("div");
  document.body.replaceChildren(host);
  localStorage.clear();
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

async function settle(): Promise<void> {
  for (let i = 0; i < 6; i += 1) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

async function mount(door: FakeDoor): Promise<void> {
  const env: StudioEnv = { door, draw: async () => null, recordHref: () => "#" };
  useStudio.setState({ data: await door.load(), view: "machines" });
  await act(async () => {
    root = createRoot(host);
    root.render(
      <I18nProvider>
        <StudioProvider env={env}>
          <StudioApp />
        </StudioProvider>
      </I18nProvider>,
    );
  });
  await settle();
}

/** The studio with Holiday calendars attached and its British days readable, a past one among them. */
function withHolidays(options: ConstructorParameters<typeof FakeDoor>[0] = {}, holidays: Row[] | null = [{ id: 900, country: "GB", region: null, day: "2026-05-25", name: "Spring bank holiday" }, ...UK_HOLIDAYS]): FakeDoor {
  const door = new FakeDoor({ ...options, facts: { addOns: ["customiser", "holiday-calendars"], ...options.facts } });
  door.data.holidays = holidays;
  return door;
}

const rows = () => [...document.querySelectorAll(".mk-holiday")].map((li) => li.textContent ?? "");

describe("the coming public holidays on Machine time", () => {
  it("lists the days from today on, by day, each one a closure away", async () => {
    await mount(withHolidays());
    expect(document.querySelector("#mk-holidays-title")?.textContent).toBe("Public holidays");
    expect(rows()).toEqual(["Mon, Aug 31Summer bank holidayAdd as a closure", "Fri, Dec 25Christmas DayAdd as a closure", "Mon, Dec 28Boxing Day (substitute day)Add as a closure"]);
  });

  it("adds one as a closure of that day, under its name, linked to it", async () => {
    const door = withHolidays();
    await mount(door);
    const add = document.querySelector<HTMLButtonElement>("[aria-label='Add as a closure: Summer bank holiday, Mon, Aug 31']")!;
    await act(async () => add.click());
    await settle();
    expect(door.calls.map((c) => c.method)).toEqual(["addHolidayClosure"]);
    expect(door.calls[0]!.args).toEqual({ id: 901, values: { holiday_id: 901, from_date: "2026-08-31", to_date: "2026-08-31", reason: "Summer bank holiday", active: true } });
    expect(rows()[0]).toBe("Mon, Aug 31Summer bank holidayAdded");
    expect(useStudio.getState().toasts.map((t) => t.text)).toEqual(["Summer bank holiday on Mon, Aug 31 is a closure now."]);
  });

  it("says a holiday already added is added, and offers it no second time", async () => {
    const door = withHolidays();
    door.data.closures.push({ id: 7, holiday_id: 902, from_date: "2026-12-25", to_date: "2026-12-25", reason: "Christmas Day", active: true });
    await mount(door);
    expect(rows()[1]).toBe("Fri, Dec 25Christmas DayAdded");
    expect(document.querySelector("[aria-label^='Add as a closure: Christmas Day']")).toBeNull();
  });

  it("says plainly when the country has none coming", async () => {
    await mount(withHolidays({}, []));
    expect(document.querySelector(".mk-holidays-none")?.textContent).toBe("United Kingdom: no public holidays coming up.");
  });

  it.each([
    ["without the add-on", () => withHolidays({ facts: { addOns: ["customiser"] } })],
    ["when its days are not readable", () => withHolidays({}, null)],
    ["to someone who may not add a closure", () => withHolidays({ roles: ["maker"] })],
  ])("is not there %s", async (_label, door) => {
    await mount(door());
    expect(document.querySelector(".mk-machines")).not.toBeNull();
    expect(document.querySelector(".mk-holidays")).toBeNull();
  });
});

describe("which country, and the closure written", () => {
  it("is the set the owner imported in the add-on's panel, with its area", () => {
    expect(holidayPlace({ days: [{ date: "2026-05-14", name: "Ascension", from: { country: "fr", region: "alsace-moselle", year: 2026 } }] }, "GBP")).toEqual({ country: "FR", region: "alsace-moselle" });
  });

  it("is the studio's own by its money when nothing was imported", () => {
    expect(holidayPlace(undefined, "GBP")).toEqual({ country: "GB", region: null });
    expect(holidayPlace({ days: [{ date: "2026-12-24", name: "Closed for the day" }] }, "DKK")).toEqual({ country: "DK", region: null });
  });

  it("keeps the holidays from today on", () => {
    const data = { ...fixture(), holidays: [...UK_HOLIDAYS].reverse() };
    expect(comingHolidays(data, "2026-12-25").map((h) => h.id)).toEqual([902, 903]);
    expect(comingHolidays({ ...data, holidays: null }, "2026-01-01")).toEqual([]);
  });

  it("is that one day, under the holiday's own name, in effect", () => {
    expect(holidayClosure({ id: 3, country: "DE", region: null, day: "2026-10-03", name: "Tag der Deutschen Einheit" })).toEqual({ holiday_id: 3, from_date: "2026-10-03", to_date: "2026-10-03", reason: "Tag der Deutschen Einheit", active: true });
  });
});

describe("the door, on the wire", () => {
  const config = (more: Partial<StaffConfig> = {}): StaffConfig => ({
    connectionId: "conn-1",
    appName: "Birch Row",
    tables: { closures: "maker_closures", "holiday-calendars:holidays": "holiday_calendars_holidays" },
    settings: {},
    timezone: "Europe/London",
    timezoneSource: "operator",
    serverTimezone: "Europe/London",
    currency: "GBP",
    now: new Date(THURSDAY).toISOString(),
    user: { id: "u1", name: "Jo Marsh", email: "jo@birchrow.example" },
    csrfToken: "tok-1",
    publicKeys: {},
    access: null,
    addOns: { customiser: { version: "1.0.16", settings: {} }, "holiday-calendars": { version: "1.0.16", settings: { days: [] } } },
    sharedTables: {},
    ...more,
  });

  function transport(holidays: Row[], refuse: SessionPortError | null = null) {
    const reads: string[] = [];
    const sent: { path: string; method: string; body: unknown }[] = [];
    const t: SessionTransport = {
      port: { config: async () => ({ side: "staff", timezone: "Europe/London", currency: "GBP", refs: {} }), assertRefs: async () => {}, list: async () => ({ data: [] }) },
      connection: async () => "conn-1",
      tableId: async (name) => name,
      relation: async () => "rel",
      refresh: async () => {},
      get: async <T,>(path: string): Promise<T> => {
        reads.push(path);
        if (path.includes("holiday_calendars_holidays")) {
          if (refuse !== null) throw refuse;
          return { data: /offset=0/.test(path) ? holidays : [] } as T;
        }
        return { data: [] } as T;
      },
      mutate: async <T,>(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown): Promise<T> => {
        sent.push({ path, method, body });
        return { data: { id: 99, ...((body as { values?: object }).values ?? {}) } } as T;
      },
    };
    return { t, reads, sent };
  }

  it("reads the add-on's days for the studio's country, keeping the country's own and none of an area", async () => {
    const { t, reads } = transport([...UK_HOLIDAYS, { id: 950, country: "GB", region: "scotland", day: "2026-11-30", name: "St Andrew's Day" }]);
    const data = await new AdminiumStudio(t, config()).load();
    expect(data.holidays?.map((h) => h.id)).toEqual([901, 902, 903]);
    const read = reads.find((p) => p.includes("holiday_calendars_holidays"))!;
    expect(decodeURIComponent(read)).toContain('where={"column":"country","op":"eq","value":"GB"}');
    expect(read).toContain("order=day.asc");
  });

  it("reads none without the add-on attached, and none when the table is closed to the person", async () => {
    const off = transport(UK_HOLIDAYS);
    expect((await new AdminiumStudio(off.t, config({ addOns: { customiser: { version: "1.0.16", settings: {} } } })).load()).holidays).toBeNull();
    expect(off.reads.some((p) => p.includes("holiday_calendars_holidays"))).toBe(false);
    const closed = transport(UK_HOLIDAYS, new SessionPortError("No.", 403, "FORBIDDEN"));
    expect((await new AdminiumStudio(closed.t, config()).load()).holidays).toBeNull();
  });

  it("writes the closure as the studio's own row", async () => {
    const { t, sent } = transport([]);
    await new AdminiumStudio(t, config()).addHolidayClosure(UK_HOLIDAYS[0]!);
    expect(sent).toEqual([{ path: "/api/v1/data/conn-1/maker_closures", method: "POST", body: { values: { holiday_id: 901, from_date: "2026-08-31", to_date: "2026-08-31", reason: "Summer bank holiday", active: true } } }]);
  });
});
