import type { AuthenticationFeedback, AuthenticationValidation } from "#lib/application/auth/types.js";

import type { TFunction } from "i18next";

/** Resolves a stable authentication feedback category through the active locale. */
export function translateAuthenticationFeedback(t: TFunction<"common">, feedback: AuthenticationFeedback): string {
  switch (feedback) {
    case "invalidCredentials":
      return t("authFlow.feedback.invalidCredentials");
    case "serviceUnavailable":
      return t("authFlow.feedback.serviceUnavailable");
    case "sessionUnavailable":
      return t("authFlow.feedback.sessionUnavailable");
    case "tooManyAttempts":
      return t("authFlow.feedback.tooManyAttempts");
  }
}

/** Resolves a stable form-validation category through the active locale. */
export function translateAuthenticationValidation(t: TFunction<"common">, issue: AuthenticationValidation): string {
  switch (issue.feedback) {
    case "email":
      return t("authFlow.validation.email");
    case "minLength":
      return t("authFlow.validation.minLength", { count: issue.limit });
    case "maxLength":
      return t("authFlow.validation.maxLength", { count: issue.limit });
    case "password":
      return t("authFlow.validation.password");
  }
}
