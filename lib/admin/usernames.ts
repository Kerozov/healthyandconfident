const USERNAME_RE = /^[a-z][a-z0-9._-]{2,31}$/;

export function normalizeUsername(input: string): string | null {
  const value = input.trim().toLowerCase();
  if (!USERNAME_RE.test(value)) return null;
  return value;
}

export function usernameRules(): string {
  return "3–32 символа, започва с буква, само малки латински букви, цифри, точка, тире и _";
}
