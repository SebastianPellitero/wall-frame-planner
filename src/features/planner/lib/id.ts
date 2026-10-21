/** A unique id. `crypto.randomUUID` is missing on insecure origins (e.g. http://192.168.x.x on a phone), hence the fallback. */
export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
