import type { ValidationResult } from "./forms";

/** Freezes real validation feedback for a visual scenario; valid samples fail loudly. */
export function validationFixture<Field extends string>(
  validate: (form: FormData) => ValidationResult<unknown, Field>,
  values: Record<string, string>
) {
  const form = new FormData();
  for (const [name, value] of Object.entries(values)) form.set(name, value);
  const result = validate(form);
  if (result.success) throw new Error("Validation stories require invalid form values");
  return { status: "validation-error" as const, issues: result.issues };
}
