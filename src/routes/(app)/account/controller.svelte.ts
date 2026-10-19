import type { AccountScreenModel } from "#lib/application/auth/types.js";

/** State rendered by the account component. */
export interface AccountScreenControllerState {
  model: AccountScreenModel;
  /** POST destination of the logout form. */
  logoutAction: string;
}

/** Pure account state and its logout transition. */
export interface AccountScreenController {
  readonly state: AccountScreenControllerState;
  /** Reconciles a completed route load with the rendered account state. */
  synchronize(model: AccountScreenModel): void;
  /** Starts a logout submission and reports whether native submission may continue. */
  submitLogout(): boolean;
}

/** Configuration for the default account controller. */
export interface AccountScreenControllerOptions extends AccountScreenControllerState {
  /** Allows the browser to submit the form after the controller accepts the transition. */
  allowNativeSubmission?: boolean;
}

/** Creates a reactive controller for the account screen. */
export function createAccountScreenController({
  model: initialModel,
  logoutAction,
  allowNativeSubmission = true,
}: AccountScreenControllerOptions): AccountScreenController {
  let model = $state(initialModel);

  return {
    get state() {
      return { model, logoutAction };
    },
    synchronize(nextModel) {
      model = nextModel;
    },
    submitLogout() {
      if (model.logoutState === "submitting") return false;
      model = { ...model, logoutState: "submitting" };
      return allowNativeSubmission;
    },
  };
}
