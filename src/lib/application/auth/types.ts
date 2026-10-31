/** Stable product feedback categories translated only at the rendering boundary. */
export type AuthenticationFeedback =
  "invalidCredentials" | "serviceUnavailable" | "sessionUnavailable" | "tooManyAttempts";

/** Stable validation categories translated only at the rendering boundary. */
export type AuthenticationValidation =
  { feedback: "email" | "password" } | { feedback: "minLength" | "maxLength"; limit: number };

/** A validation problem tied to one named form control. */
export type FormIssue<Field extends string> = AuthenticationValidation & {
  field: Field;
};

/** Serializable states shared by progressively enhanced forms. */
export type FormState<Field extends string> =
  | { status: "ready" }
  | { status: "submitting" }
  | { status: "validation-error"; issues: readonly FormIssue<Field>[] }
  | { status: "service-error"; feedback: AuthenticationFeedback };

/** The journeys the shell authentication dialog offers. */
export type AuthenticationJourney = "login";

/** The fields of the shell authentication forms. */
export type AuthenticationField = "email" | "password";

/** Pure login form state, the only journey of the shell authentication dialog. */
export interface AuthenticationPanelModel {
  journey: AuthenticationJourney;
  state: FormState<AuthenticationField>;
}

/** Claims and expiry data resolved by the server-side session boundary. */
export interface AccountClaimsSummary {
  userId: string;
  roles: readonly string[];
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

/** Session recap availability, independent of the logout form state. */
export type AccountClaimsState =
  | ({ status: "ready" } & AccountClaimsSummary)
  | { status: "loading" }
  | { status: "error"; feedback: AuthenticationFeedback };

/** The account's email and the change awaiting confirmation, as Authentication reports them. */
export interface AccountCredentialsSummary {
  email: string;
  pendingEmail?: { email: string; expiresAt: string };
}

/** Email availability, independent of the session recap and the logout form. */
export type AccountCredentialsState = ({ status: "ready" } & AccountCredentialsSummary) | { status: "unavailable" };

/** Account recap, email and logout action. */
export interface AccountScreenModel {
  claims: AccountClaimsState;
  credentials: AccountCredentialsState;
  logoutState: "ready" | "submitting";
}
