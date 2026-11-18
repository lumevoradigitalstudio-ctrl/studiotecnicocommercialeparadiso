import type { LLMProvider, Usage } from "./provider";

export function estimateCostEur(p: LLMProvider, u: Usage): number {
  return (u.inputTokens * p.pricePerMTokEur.input + u.outputTokens * p.pricePerMTokEur.output) / 1_000_000;
}

export interface QuotaLimits { perDay: number; perMonth: number; maxConcurrent: number }
export type QuotaDecision = { ok: true } | { ok: false; reason: "daily" | "monthly" | "concurrency" | "budget" };

/** Riferimento in-memory della logica SQL `consume_ai_quota` (atomica). Usato per test e per modalità demo locale. */
export class InMemoryQuota {
  private day = new Map<string, number>();
  private month = new Map<string, number>();
  private inflight = new Map<string, number>();
  private spent = new Map<string, number>();
  constructor(private globalMonthlyBudgetEur = Infinity) {}
  private static keys(user: string, now: Date) {
    const d = now.toISOString().slice(0, 10);
    return { d: `${user}|${d}`, m: `${user}|${d.slice(0, 7)}` };
  }
  /** Sincrono ⇒ atomico nel singolo event loop. */
  tryConsume(user: string, lim: QuotaLimits, now = new Date()): QuotaDecision {
    const k = InMemoryQuota.keys(user, now);
    if ((this.inflight.get(user) ?? 0) >= lim.maxConcurrent) return { ok: false, reason: "concurrency" };
    if ([...this.spent.values()].reduce((a, b) => a + b, 0) >= this.globalMonthlyBudgetEur) return { ok: false, reason: "budget" };
    if ((this.day.get(k.d) ?? 0) >= lim.perDay) return { ok: false, reason: "daily" };
    if ((this.month.get(k.m) ?? 0) >= lim.perMonth) return { ok: false, reason: "monthly" };
    this.day.set(k.d, (this.day.get(k.d) ?? 0) + 1);
    this.month.set(k.m, (this.month.get(k.m) ?? 0) + 1);
    this.inflight.set(user, (this.inflight.get(user) ?? 0) + 1);
    return { ok: true };
  }
  release(user: string, costEur: number) {
    this.inflight.set(user, Math.max(0, (this.inflight.get(user) ?? 1) - 1));
    this.spent.set(user, (this.spent.get(user) ?? 0) + costEur);
  }
  totalSpentEur() { return [...this.spent.values()].reduce((a, b) => a + b, 0); }
}
