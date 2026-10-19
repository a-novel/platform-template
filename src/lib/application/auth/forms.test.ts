import { validateLogin } from "./forms";

import { describe, expect, it } from "vitest";

import { PasswordSchema, TokenCreateRequestSchema } from "@a-novel/service-authentication-rest";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(values)) data.set(name, value);
  return data;
}

const passwordLengths = [
  0,
  Number(PasswordSchema.minLength) - 1,
  Number(PasswordSchema.minLength),
  Number(PasswordSchema.maxLength),
  Number(PasswordSchema.maxLength) + 1,
];

const emails = ["creator@example.test", "a+b@example.test", "not-an-email", "", `${"a".repeat(400)}@example.test`];

describe("service-derived login validation", () => {
  it.each(passwordLengths)("matches the service password schema at length %i", (length) => {
    expect(PasswordSchema.minLength).toBeGreaterThan(0);
    expect(PasswordSchema.maxLength).toBeGreaterThan(Number(PasswordSchema.minLength));
    const values = { email: "creator@example.test", password: "x".repeat(length) };
    expect(validateLogin(form(values)).success).toBe(TokenCreateRequestSchema.safeParse(values).success);
  });

  it.each(emails)("matches the service email check for %s", (email) => {
    const values = { email, password: "x".repeat(Number(PasswordSchema.minLength)) };
    expect(validateLogin(form(values)).success).toBe(TokenCreateRequestSchema.safeParse(values).success);
  });

  it("normalizes email and preserves password whitespace", () => {
    expect(validateLogin(form({ email: "  Creator@Example.com ", password: "  pass  " }))).toEqual({
      success: true,
      value: { email: "creator@example.com", password: "  pass  " },
    });
  });

  it("returns API bounds as translation values without echoing credentials", () => {
    const tooLong = validateLogin(
      form({ email: "creator@example.test", password: "s".repeat(Number(PasswordSchema.maxLength) + 1) })
    );
    expect(tooLong).toEqual({
      success: false,
      issues: [{ field: "password", feedback: "maxLength", limit: PasswordSchema.maxLength }],
    });
    expect(JSON.stringify(tooLong)).not.toContain("ssss");
    expect(
      validateLogin(form({ email: "creator@example.test", password: "x".repeat(Number(PasswordSchema.minLength) - 1) }))
    ).toEqual({
      success: false,
      issues: [{ field: "password", feedback: "minLength", limit: PasswordSchema.minLength }],
    });
  });

  it("keeps one error per field and reports missing or non-text controls safely", () => {
    const input = new FormData();
    input.set("email", new Blob(["not-a-text-control"]), "email.txt");
    expect(validateLogin(input)).toEqual({
      success: false,
      issues: [
        { field: "email", feedback: "email" },
        { field: "password", feedback: "password" },
      ],
    });
  });
});
