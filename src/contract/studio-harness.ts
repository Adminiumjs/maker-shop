/**
 * The contract's Adminium: the BUILT server of an Adminium checkout
 * (`ADMINIUM_REPO`), booted by its own e2e script on one engine, with this
 * repo's own `manifest.json` and sample packed as an operator uploads them,
 * and the Customiser it requires packed from a built add-ons checkout
 * (`ADD_ONS_REPO`).
 *
 * Everything is spoken over HTTP, as the dashboard and the studio's screens
 * speak it: nothing here reaches into the server's modules.
 *
 * Tests only; nothing that ships imports it.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deflateSync, gzipSync } from "node:zlib";

export type Engine = "sqlite" | "postgres" | "mysql";

const REPO = fileURLToPath(new URL("../..", import.meta.url));
const read = (path: string) => readFileSync(path, "utf8");

export const ADMINIUM_REPO = process.env["ADMINIUM_REPO"] ?? "";
export const ADD_ONS_REPO = process.env["ADD_ONS_REPO"] ?? join(REPO, "..", "add-ons");
const E2E_SERVER = join(ADMINIUM_REPO, "apps", "e2e", "scripts", "e2e-server.mjs");
const addOnDir = (key: string) => join(ADD_ONS_REPO, "packages", key);

/** Why the contract cannot run here, or null when it can. */
export function missing(): string | null {
  if (process.env["CONTRACT"] !== "1" && process.env["ADMINIUM_REQUIRE_CONTRACT"] !== "1") return "set CONTRACT=1 to run it";
  if (ADMINIUM_REPO === "") return "ADMINIUM_REPO is not set";
  if (!existsSync(join(ADMINIUM_REPO, "apps", "server", "dist", "app.js"))) return `no built server in ${ADMINIUM_REPO}`;
  if (!existsSync(join(ADMINIUM_REPO, "apps", "dashboard", "dist", "index.html"))) return `no built dashboard in ${ADMINIUM_REPO}`;
  if (!existsSync(E2E_SERVER)) return `no e2e server script in ${ADMINIUM_REPO}`;
  if (!existsSync(join(addOnDir("customiser"), "dist", "check.js"))) return `no built Customiser in ${ADD_ONS_REPO}`;
  return null;
}

/** `CONTRACT_ENGINES=postgres,mysql` runs only those. */
const ONLY = (process.env["CONTRACT_ENGINES"] ?? "").split(",").map((e) => e.trim()).filter((e) => e !== "");
const wanted = (engine: Engine) => ONLY.length === 0 || ONLY.includes(engine);

/** The engines this run can reach: SQLite always, the others with their URLs. */
export const ENGINES: [Engine, boolean][] = [
  ["sqlite", wanted("sqlite")],
  ["postgres", wanted("postgres") && (process.env["TEST_POSTGRES_URL"] ?? "") !== ""],
  ["mysql", wanted("mysql") && (process.env["TEST_MYSQL_URL"] ?? "") !== ""],
];

// ── the packages, as an operator uploads them ───────────────────────────────

const BLOCK = 512;

/** An npm-shaped tarball (`package/…` members), which is what the server's hardened unpacker reads. */
function tarball(files: Record<string, Buffer>): Buffer {
  const members: Buffer[] = [];
  const put = (block: Buffer, at: number, length: number, value: string) => Buffer.from(value, "latin1").subarray(0, length).copy(block, at);
  for (const [path, body] of Object.entries(files)) {
    const header = Buffer.alloc(BLOCK);
    put(header, 0, 100, `package/${path}`);
    put(header, 100, 8, "0000644\0");
    put(header, 124, 12, `${body.length.toString(8).padStart(11, "0")}\0`);
    put(header, 136, 12, "00000000000\0");
    put(header, 156, 1, "0");
    put(header, 257, 6, "ustar\0");
    put(header, 263, 2, "00");
    header.fill(0x20, 148, 156);
    let sum = 0;
    for (const byte of header) sum += byte;
    put(header, 148, 8, `${sum.toString(8).padStart(6, "0")}\0 `);
    members.push(header, body, Buffer.alloc((BLOCK - (body.length % BLOCK)) % BLOCK));
  }
  members.push(Buffer.alloc(BLOCK * 2));
  return gzipSync(Buffer.concat(members), { mtime: 0 } as never);
}

export interface Bundle {
  buffer: Buffer;
  integrity: string;
  key: string;
  version: string;
}

const bundle = (files: Record<string, Buffer>, key: string, version: string): Bundle => {
  const buffer = tarball(files);
  return { buffer, integrity: `sha512-${createHash("sha512").update(buffer).digest("base64")}`, key, version };
};

/** The version the app asks of an add-on (`^x.y.z` or `>=x.y.z`): its floor. */
function floorOf(key: string): string | null {
  const app = JSON.parse(read(join(REPO, "manifest.json"))) as { addOns?: { requires?: { key: string; range: string }[]; suggests?: { key: string; range: string }[] } };
  const range = [...(app.addOns?.requires ?? []), ...(app.addOns?.suggests ?? [])].find((r) => r.key === key)?.range ?? "";
  return /^(?:\^|>=\s*)(\d+\.\d+\.\d+)$/.exec(range.trim())?.[1] ?? null;
}

const newer = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split(".").map(Number));
  for (let i = 0; i < 3; i += 1) if (x![i] !== y![i]) return x![i]! > y![i]!;
  return false;
};

/**
 * An add-on, packed as its release packs it (`files[]`, the name rewritten).
 * A checkout built before the release the app asks for carries the version
 * before it: it is packed at the version the app asks for, as that release
 * will be.
 */
export function addOnBundle(key: string): Bundle {
  const dir = addOnDir(key);
  const pkg = JSON.parse(read(join(dir, "package.json"))) as Record<string, unknown> & { name: string; version: string; files: string[] };
  const files: Record<string, Buffer> = {};
  const add = (path: string) => {
    const absolute = join(dir, path);
    if (!existsSync(absolute)) return;
    if (statSync(absolute).isDirectory()) {
      for (const name of readdirSync(absolute)) add(join(path, name));
      return;
    }
    files[relative(dir, absolute).split("\\").join("/")] = readFileSync(absolute);
  };
  for (const entry of pkg.files) add(entry);
  const manifest = JSON.parse(read(join(dir, "manifest.json"))) as { key: string; version: string };
  const floor = floorOf(key);
  const version = floor !== null && newer(floor, manifest.version) ? floor : manifest.version;
  const { devDependencies: _dev, scripts: _scripts, ...shipped } = pkg;
  files["package.json"] = Buffer.from(JSON.stringify({ ...shipped, name: pkg.name.replace(/^@adminium\//, "@adminiumjs/"), version }));
  files["manifest.json"] = Buffer.from(JSON.stringify({ ...manifest, version }));
  return bundle(files, manifest.key, version);
}

/** This app's package: its manifest (or the text given: the same app written for another floor), its sample files, and a placeholder page for each side. */
export function appBundle(options: { manifest?: string } = {}): Bundle {
  const text = options.manifest ?? read(join(REPO, "manifest.json"));
  const manifest = JSON.parse(text) as { key: string; version: string; sampleData?: { file: string; addOns?: Record<string, { file: string }> } };
  const files: Record<string, Buffer> = {
    "package.json": Buffer.from(JSON.stringify({ name: `@adminiumjs/app-${manifest.key}`, version: manifest.version })),
    "manifest.json": Buffer.from(text),
  };
  for (const side of ["staff", "customer"]) files[`${side}/index.html`] = Buffer.from(`<!doctype html><html><body data-app="${manifest.key}-${side}"></body></html>`);
  if (manifest.sampleData !== undefined) {
    files[manifest.sampleData.file] = readFileSync(join(REPO, manifest.sampleData.file));
    for (const section of Object.values(manifest.sampleData.addOns ?? {})) files[section.file] = readFileSync(join(REPO, section.file));
  }
  return bundle(files, manifest.key, manifest.version);
}

// ── the server ──────────────────────────────────────────────────────────────

export interface Server {
  base: string;
  sink: string;
  log(): string;
  /** Set the server's clock to `at` (epoch ms); it runs on from there, or with `still` stands at it until set again. */
  setClock(at: number, still?: boolean): Promise<void>;
  stop(): Promise<void>;
}

/** The server at `port`, its SMTP sink and the sink's mailbox on the next two. */
export const PORTS_PER_ENGINE = 3;

export async function boot(engine: Engine, port: number, now: number, database: string): Promise<Server> {
  const clockFile = join(tmpdir(), `maker-contract-clock-${String(port)}`);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    // An add-on packed from a checkout has no catalogue to vouch for its bytes: a developer's server runs it by name.
    ADMINIUM_ADD_ON_DEV_TRUST: "customiser",
    E2E_ENGINE: engine,
    E2E_PORT: String(port),
    E2E_SMTP_PORT: String(port + 1),
    E2E_SINK_PORT: String(port + 2),
    E2E_FAKE_LLM_PORT: "0",
    E2E_DATABASE: database,
    CONTRACT_NOW: String(now),
    CONTRACT_CLOCK_FILE: clockFile,
    NODE_OPTIONS: `${process.env["NODE_OPTIONS"] ?? ""} --import=${pathToFileURL(fileURLToPath(new URL("./studio-clock.mjs", import.meta.url))).href}`.trim(),
  };
  const child: ChildProcess = spawn(process.execPath, [E2E_SERVER], { cwd: join(ADMINIUM_REPO, "apps", "e2e"), env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  child.stdout?.on("data", (chunk: Buffer) => (log += chunk.toString()));
  child.stderr?.on("data", (chunk: Buffer) => (log += chunk.toString()));
  const base = `http://127.0.0.1:${String(port)}`;
  const deadline = Date.now() + 180_000;
  for (;;) {
    if (child.exitCode !== null) throw new Error(`the ${engine} server exited:\n${log.slice(-4000)}`);
    try {
      const res = await fetch(`${base}/api/v1/healthz`);
      if (res.ok) break;
    } catch {
      // not listening yet
    }
    if (Date.now() > deadline) {
      child.kill("SIGKILL");
      throw new Error(`the ${engine} server never answered:\n${log.slice(-4000)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return {
    base,
    sink: `http://127.0.0.1:${String(port + 2)}`,
    log: () => log,
    setClock: async (at, still = false) => {
      writeFileSync(clockFile, still ? `${String(at)} still` : String(at));
      child.kill("SIGUSR2");
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null) return resolve();
        child.once("exit", () => resolve());
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 5_000);
      }),
  };
}

// ── speaking to it ──────────────────────────────────────────────────────────

export interface Reply<T = unknown> {
  status: number;
  body: T;
  code: string | undefined;
  details: Record<string, unknown>;
}

/** A caller: someone signed in to the dashboard, or to the studio's own screens. */
export class Caller {
  private cookie = "";
  private csrf = "";
  readonly base: string;
  constructor(base: string) {
    this.base = base;
  }

  async send<T = unknown>(method: string, path: string, body?: unknown, extra: Record<string, string> = {}): Promise<Reply<T>> {
    for (let attempt = 0; ; attempt += 1) {
      const res = await fetch(`${this.base}${path}`, {
        method,
        headers: {
          origin: this.base,
          ...(this.cookie === "" ? {} : { cookie: this.cookie }),
          ...(this.csrf === "" || method === "GET" ? {} : { "x-adminium-csrf": this.csrf }),
          ...(body === undefined ? {} : Buffer.isBuffer(body) ? { "content-type": "application/octet-stream" } : { "content-type": "application/json" }),
          ...extra,
        },
        ...(body === undefined ? {} : { body: Buffer.isBuffer(body) ? new Uint8Array(body) : JSON.stringify(body) }),
      });
      const set = res.headers.getSetCookie?.() ?? [];
      if (set.length > 0) this.cookie = set.map((c) => c.split(";")[0]).join("; ");
      if (res.status === 429 && attempt < 6) {
        await new Promise((resolve) => setTimeout(resolve, 5_000));
        continue;
      }
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text === "" ? null : JSON.parse(text);
      } catch {
        // not JSON
      }
      const error = (parsed as { error?: { code?: string; details?: Record<string, unknown> } } | null)?.error;
      return { status: res.status, body: parsed as T, code: error?.code, details: error?.details ?? {} };
    }
  }

  /** Sign in to the dashboard, and take the session's write token as the dashboard does. */
  async signIn(email: string, password: string): Promise<void> {
    ok(await this.post("/api/v1/auth/login", { email, password }));
    this.csrf = ok(await this.get<{ data: { csrfToken: string } }>("/api/v1/bootstrap")).data.csrfToken;
  }

  /** Sign in as someone whose role opens the app's own screens: the write token comes with the screens' own config. */
  async signInToScreens(email: string, password: string, app = "maker"): Promise<void> {
    ok(await this.post("/api/v1/auth/login", { email, password }));
    this.csrf = ok(await this.get<{ csrfToken: string }>(`/apps/${app}/staff/surface-config.json`)).csrfToken;
  }

  /** A `fetch` that goes to this server with this caller's session, as the studio's own transport is handed. */
  fetchAs(): typeof fetch {
    return (async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (this.cookie !== "") headers.set("cookie", this.cookie);
      headers.set("origin", this.base);
      return fetch(new URL(String(input), this.base), { ...init, headers });
    }) as typeof fetch;
  }

  get = <T = unknown>(path: string) => this.send<T>("GET", path);
  post = <T = unknown>(path: string, body?: unknown) => this.send<T>("POST", path, body ?? {});
  patch = <T = unknown>(path: string, body: unknown) => this.send<T>("PATCH", path, body);
  put = <T = unknown>(path: string, body: unknown) => this.send<T>("PUT", path, body);
}

/** Expect a status, and hand back the body. */
export function ok<T>(reply: Reply<T>, status = 200): T {
  if (reply.status !== status) throw new Error(`expected ${String(status)}, got ${String(reply.status)}: ${JSON.stringify(reply.body).slice(0, 1500)}`);
  return reply.body;
}

export const until = async <T>(look: () => Promise<T | undefined>, label: string, ms = 120_000): Promise<T> => {
  const deadline = Date.now() + ms;
  for (;;) {
    const found = await look();
    if (found !== undefined) return found;
    if (Date.now() > deadline) throw new Error(`waited ${String(ms / 1000)} s for ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
};

/**
 * Add the app's sample and wait for its job to finish: the status route says
 * "loaded" from the first rows on, before every table is in. A job that
 * fails, or fails once and waits to try again, stops the contract with what
 * it said.
 */
export async function addSample(caller: Caller, app = "maker"): Promise<void> {
  const { jobId } = ok(await caller.post<{ jobId: string }>(`/api/v1/apps/${app}/sample-data`));
  await until(async () => {
    const job = ok(await caller.get<{ data: { status: string; attempts: number; lastError: string | null } }>(`/api/v1/jobs/${encodeURIComponent(jobId)}`)).data;
    if (job.status === "succeeded") return true;
    if (job.status === "failed" || job.status === "cancelled" || (job.lastError !== null && job.attempts > 0)) throw new Error(`the sample's job ${job.status} after ${String(job.attempts)} tries: ${String(job.lastError)}`);
    return undefined;
  }, "the sample's job to finish", 240_000);
}

/** A password a new person signs in with. */
export const newPassword = (): string => `${randomBytes(18).toString("base64url")}Aa1!`;

// ── a picture ───────────────────────────────────────────────────────────────

const CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return (bytes: Buffer) => {
    let c = 0xffffffff;
    for (const b of bytes) c = table[(c ^ b) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
})();

/** A real PNG of one colour: what a browser's canvas hands back for a proof. */
export function png(width = 12, height = 8): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(CRC(body));
    return Buffer.concat([head, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) rows.set([0x6b, 0x44, 0x23], y * (width * 3 + 1) + 1 + x * 3);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

// ── the studio, installed ───────────────────────────────────────────────────

const ADMIN = { email: process.env["E2E_ADMIN_EMAIL"] ?? "e2e@adminium.local", password: process.env["E2E_ADMIN_PASSWORD"] ?? "adminium-e2e-password" };

/**
 * The Customiser and this app installed together on a booted server, as an
 * operator installs them, in the studio's own database (a file of its own on
 * SQLite; the e2e server's database on Postgres and MySQL), the connection in
 * Settle's zone and pounds, and the app's sample written at `at` with the
 * clock standing there. Hands back the operator, signed in, and the
 * connection.
 */
export async function installStudio(server: Server, engine: Engine, at: number, manifest: string, dbFile: string): Promise<{ owner: Caller; connectionId: string }> {
  const owner = new Caller(server.base);
  await owner.signIn(ADMIN.email, ADMIN.password);
  let connectionId: string;
  if (engine === "sqlite") {
    rmSync(dbFile, { force: true });
    writeFileSync(dbFile, "");
    connectionId = ok(await owner.post<{ id: string }>("/api/v1/connections", { name: "birch-row", engine: "sqlite", dsn: `sqlite:${dbFile}` }), 201).id;
  } else {
    connectionId = ok(await owner.get<{ connections: { id: string; name: string }[] }>("/api/v1/connections")).connections.find((c) => c.name === "northwind")!.id;
  }
  const customiser = addOnBundle("customiser");
  const stagedAddOn = await owner.post(`/api/v1/add-ons/upload?expectedSha512=${encodeURIComponent(customiser.integrity)}`, customiser.buffer);
  if (![200, 201].includes(stagedAddOn.status)) throw new Error(`the Customiser was not staged: ${JSON.stringify(stagedAddOn.body).slice(0, 800)}`);
  const app = appBundle({ manifest });
  const staged = await owner.post(`/api/v1/apps/upload?expectedSha512=${encodeURIComponent(app.integrity)}`, app.buffer);
  if (![200, 201].includes(staged.status)) throw new Error(`the app was not staged: ${JSON.stringify(staged.body).slice(0, 800)}`);
  const body = { key: app.key, version: app.version, connectionId };
  const plan = ok(await owner.post<{ plan: { installable: boolean; checksum: string } }>("/api/v1/apps/plan", { ...body, addOns: [customiser.key] })).plan;
  if (!plan.installable) throw new Error(`not installable: ${JSON.stringify(plan).slice(0, 3000)}`);
  ok(await owner.post("/api/v1/apps/install", { ...body, planChecksum: plan.checksum, addOns: [{ key: customiser.key, version: customiser.version }] }));
  ok(await owner.patch(`/api/v1/connections/${connectionId}`, { timezone: "Europe/London", currency: "GBP" }));
  await server.setClock(at, true);
  await addSample(owner);
  await server.setClock(at);
  return { owner, connectionId };
}

/** Someone holding one of the app's roles and no other, signed in to the studio's own screens. */
export async function personWith(owner: Caller, server: Server, slug: string, email: string, name: string): Promise<Caller> {
  const roles = ok(await owner.get<{ roles: { id: string; name: string; slug?: string }[] }>("/api/v1/roles")).roles;
  const role = roles.find((r) => r.slug === `maker-${slug}`) ?? roles.find((r) => r.name.toLowerCase() === slug)!;
  const invited = ok(await owner.post<{ invite: { token: string } }>("/api/v1/users", { email, name, roleIds: [role.id] }), 201);
  const password = newPassword();
  ok(await new Caller(server.base).post("/api/v1/auth/password/reset", { token: invited.invite.token, newPassword: password }));
  const caller = new Caller(server.base);
  await caller.signInToScreens(email, password);
  return caller;
}
