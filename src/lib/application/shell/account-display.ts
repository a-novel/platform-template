/** AccountDisplay is how the shell names an account. */
export interface AccountDisplay {
  displayName: string;
  initials: string;
}

/** Turns an email handle such as `maya.chen+template` into a name and initials. */
export function accountDisplayFromHandle(handle: string): AccountDisplay {
  const localPart = handle.split("+", 1)[0] ?? "";
  const words = localPart
    .split(/[._-]+/u)
    .filter(Boolean)
    .map(capitalize);
  const displayName = words.join(" ") || localPart || handle;
  const initials = words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  return { displayName, initials };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}
