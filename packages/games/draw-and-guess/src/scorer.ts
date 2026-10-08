export interface ScoreResult {
  guesserScore: number;
  drawerScore: number;
}

export function calculateGuessScore(
  rank: number, // 1st = 1, 2nd = 2...
  timeLeftRatio: number // 0.0 to 1.0 (timeLeft / totalDuration)
): number {
  const baseScore = 50;
  // Rank bonus: 1st +50, 2nd +35, 3rd +20, others +10
  const rankBonus = rank === 1 ? 50 : rank === 2 ? 35 : rank === 3 ? 20 : 10;
  // Time bonus up to 25 pts
  const timeBonus = Math.round(timeLeftRatio * 25);
  return baseScore + rankBonus + timeBonus;
}

export function calculateDrawerScore(correctGuessCount: number, totalGuessers: number): number {
  if (correctGuessCount === 0) return 0;
  const ratio = Math.min(1, correctGuessCount / Math.max(1, totalGuessers));
  return Math.round(50 + ratio * 50);
}
