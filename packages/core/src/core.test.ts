import { describe, it, expect } from "vitest";
import { resolvePlan, UserPreferences, WorkShift, PantryItem, PLAN_LIMITS } from "./index";

describe("core", () => {
  it("entitlement assente/inattivo/scaduto → free", () => {
    expect(resolvePlan(null)).toBe("free");
    expect(resolvePlan({ active: false, expiresAt: null })).toBe("free");
    expect(resolvePlan({ active: true, expiresAt: "2020-01-01T00:00:00Z" })).toBe("free");
    expect(resolvePlan({ active: true, expiresAt: "2999-01-01T00:00:00Z" })).toBe("plus");
    expect(resolvePlan({ active: true, expiresAt: null })).toBe("plus");
  });
  it("preferenze: default sensati, peso non obbligatorio", () => {
    const p = UserPreferences.parse({ goal: "organizzare_pasti" });
    expect(p.excludedFoods).toEqual([]); expect(p.notificationsEnabled).toBe(false);
    expect(UserPreferences.safeParse({ goal: "dimagrire_in_fretta" }).success).toBe(false);
  });
  it("turni e dispensa validati", () => {
    expect(WorkShift.safeParse({ weekday: 1, start: "16:00", end: "00:00" }).success).toBe(true);
    expect(WorkShift.safeParse({ weekday: 1, start: "25:00", end: "00:00" }).success).toBe(false);
    expect(PantryItem.safeParse({ name: "" }).success).toBe(false);
  });
  it("Plus ha limiti maggiori di Free, e nessun piano è illimitato", () => {
    expect(PLAN_LIMITS.plus.aiMessagesPerDay).toBeGreaterThan(PLAN_LIMITS.free.aiMessagesPerDay);
    for (const l of Object.values(PLAN_LIMITS)) expect(Number.isFinite(l.aiMessagesPerDay)).toBe(true);
  });
});
