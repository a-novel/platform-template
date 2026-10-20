import type { ValidationResult } from "./forms";

const validFields = {
  email: "creator@example.test",
  password: "new-password",
};

/** Builds the form data a browser submits for these field values. */
export function formData(values: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  return form;
}

/** Builds form data that passes every platform form's validation. */
export function validForm(): FormData {
  return formData(validFields);
}

/** Freezes real validation feedback for a visual scenario. A valid sample throws. */
export function validationFixture<Field extends string>(
  validate: (form: FormData) => ValidationResult<unknown, Field>,
  values: Record<string, string>
) {
  const result = validate(formData(values));
  if (result.success) throw new Error("Validation stories require invalid form values");
  return { status: "validation-error" as const, issues: result.issues };
}
