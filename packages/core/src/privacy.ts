/** Scrubbing per il monitoraggio errori (Sentry `beforeSend`): niente chat, email, token o identificativi nei log. */
const SENSITIVE_KEYS = /^(message|messages|content|text|prompt|history|email|password|authorization|cookie|token|access_token|refresh_token|apikey|api_key|x-api-key|description|user|username|ip_address)$/i;
const PATTERNS: [RegExp, string][] = [
  [/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[jwt]"],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, "Bearer [token]"],
  [/\bsb_(publishable|secret)_[A-Za-z0-9_-]+/g, "[supabase-key]"],
  [/\bsk-[A-Za-z0-9_-]{12,}/g, "[api-key]"],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[uuid]"],
];
export function scrubText(s: string): string { return PATTERNS.reduce((a, [re, rep]) => a.replace(re, rep), s); }
export function scrubDeep<T>(v: T, depth = 0): T {
  if (depth > 8) return "[truncated]" as unknown as T;
  if (typeof v === "string") return scrubText(v) as unknown as T;
  if (Array.isArray(v)) return v.map(x => scrubDeep(x, depth + 1)) as unknown as T;
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SENSITIVE_KEYS.test(k) ? "[redacted]" : scrubDeep(x, depth + 1)])) as T;
  return v;
}
/** Usare come `beforeSend` e `beforeBreadcrumb`; configurare anche sendDefaultPii:false. */
export const scrubEvent = <T>(e: T): T => scrubDeep(e);
