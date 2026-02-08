/**
 * Risk control utilities.
 * Reads the user's risk_level and applies trading restrictions.
 */

export interface RiskCheckResult {
  allowed: boolean;
  reason?: string;
  /** Forced slippage multiplier (1.0 = no adjustment) */
  slippageMultiplier: number;
  /** Max leverage cap enforced by risk engine */
  maxLeverage: number;
}

/**
 * Evaluate risk constraints for a given user risk level.
 * - normal: normal trading, no restrictions
 * - win:    user always wins (必赢模式)
 * - lose:   user always loses (必输模式)
 */
export function evaluateRisk(
  riskLevel: "normal" | "win" | "lose"
): RiskCheckResult {
  switch (riskLevel) {
    case "normal":
      return {
        allowed: true,
        slippageMultiplier: 1.0,
        maxLeverage: 200,
      };
    case "win":
      return {
        allowed: true,
        slippageMultiplier: 1.0,
        maxLeverage: 200,
        reason: "Win mode: user always wins",
      };
    case "lose":
      return {
        allowed: true,
        slippageMultiplier: 1.0,
        maxLeverage: 200,
        reason: "Lose mode: user always loses",
      };
  }
}
