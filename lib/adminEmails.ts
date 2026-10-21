/** Email degli admin da ADMIN_EMAILS (separate da virgole), in minuscolo. */
export function adminEmails(env: Record<string, string | undefined> = process.env) {
  return (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}
