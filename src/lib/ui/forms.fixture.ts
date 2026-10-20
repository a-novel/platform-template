import { expect } from "vitest";
import { page } from "vitest/browser";

/** Submits the form of the named button through its submit event, and returns that form. */
export async function submitForm(buttonName: string): Promise<HTMLFormElement> {
  const buttonLocator = page.getByRole("button", { name: buttonName });
  await expect.element(buttonLocator).toBeVisible();
  const button = buttonLocator.element() as HTMLButtonElement;
  const form = button.form;
  expect(form).not.toBeNull();

  form?.dispatchEvent(new SubmitEvent("submit", { bubbles: true, cancelable: true }));
  return form as HTMLFormElement;
}

/**
 * Checks a form's action layout at phone and desktop widths. The submit button starts at the form's
 * edge and spans it on a phone, its feedback sits right above it, and both keep twice the field gap
 * from the last field.
 */
export async function expectFormActionLayout(form: HTMLFormElement) {
  const button = form.querySelector('button[type="submit"]');
  expect(button).not.toBeNull();
  if (!button) return;

  const originalViewport = { width: window.innerWidth, height: window.innerHeight };
  try {
    for (const width of [320, 390, 1280]) {
      await page.viewport(width, 844);
      const bounds = button.getBoundingClientRect();
      const formBounds = form.getBoundingClientRect();
      expect(bounds.left).toBeCloseTo(formBounds.left);
      if (width < 560) expect(bounds.width).toBeCloseTo(formBounds.width);
      else expect(bounds.width).toBeLessThan(formBounds.width);
      const feedback = form.querySelector('[role="alert"], [role="status"]');
      if (feedback) expect(bounds.top - feedback.getBoundingClientRect().bottom).toBe(16);
      const lastInput = Array.from(form.querySelectorAll("input")).at(-1);
      if (lastInput)
        expect(
          (feedback ?? button).getBoundingClientRect().top - lastInput.getBoundingClientRect().bottom
        ).toBeGreaterThanOrEqual(32);
    }
  } finally {
    await page.viewport(originalViewport.width, originalViewport.height);
  }
}
