import { describe, it, expect } from "vitest";
import { estimateTokens, calculateAiCost } from "@/lib/ai-quota";

describe("ai-quota helpers", () => {
  it("estimateTokens approximates token count", () => {
    const short = "hello world";
    const long = "a".repeat(4000);
    expect(estimateTokens(short)).toBeGreaterThanOrEqual(1);
    expect(estimateTokens(long)).toBeGreaterThan(900);
  });

  it("calculateAiCost returns number and scales with tokens", () => {
    const cost1 = calculateAiCost("gemini-2.5-flash", 1000, 2000);
    const cost2 = calculateAiCost("gemini-2.5-flash", 2000, 4000);
    const cost3 = calculateAiCost("gpt-4o", 1000, 1000);
    expect(typeof cost1).toBe("number");
    expect(cost2).toBeGreaterThanOrEqual(cost1);
    expect(cost3).toBeGreaterThanOrEqual(0);
  });
});
