import type { AuthenticationJourney } from "../auth/types";

/** The view the authentication dialog shows, kept in the URL state. Each authentication journey has its own. */
export type AuthDialogView = AuthenticationJourney;

/** Session states the shell can render without owning session logic. */
export type ShellSession =
  | { status: "anonymous" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "downtime" }
  | { status: "authenticated"; displayName: string; initials?: string };

/** Serializable state consumed by the pure application shell. */
export interface ShellViewModel {
  activeNavigation: "home" | "privacy" | null;
  rail: "expanded" | "collapsed";
  drawerOpen: boolean;
  authView: AuthDialogView | null;
  session: ShellSession;
}
