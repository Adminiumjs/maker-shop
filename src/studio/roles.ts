/**
 * What the app's three roles do on the studio's screens (plan §8): the owner
 * everything; the maker the bench, the proofs and a product's lettering; the
 * packer the post. A button shows by the role, and the role's grants and
 * limits are what refuse the write: a hidden button is not a lock.
 *
 * A server that names no roles (an older one) shows every button, and refuses
 * what it refuses.
 */
import type { Person } from "./door.ts";
import { ROLE_PANELS, type PanelId } from "../manifest/panels.ts";

const has = (who: Person, ...roles: string[]) => who.roles.length === 0 || roles.some((r) => who.roles.includes(r));

/** Moves a line along the bench, marks pieces made or ready, records a spoil. */
export const mayMake = (who: Person): boolean => has(who, "owner", "maker") && who.can("order_lines", "update");

/** Takes the post office run. */
export const mayPost = (who: Person): boolean => has(who, "owner", "packer") && who.can("orders", "update");

/** Reads the customers and what they were charged. */
export const mayReadCustomers = (who: Person): boolean => who.can("customers", "read");

/**
 * Opens one of the Customiser's panels on the studio's screens: the role
 * holds it (`ROLE_PANELS`). Adminium serves the panel's code only to a role
 * that holds it; this keeps the way to it off the screen of anyone else.
 */
export const mayOpenPanel = (who: Person, panel: PanelId): boolean =>
  who.roles.length === 0 || who.roles.some((role) => ROLE_PANELS[role]?.includes(panel) === true);
