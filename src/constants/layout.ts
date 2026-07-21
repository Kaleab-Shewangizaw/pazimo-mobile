import { Spacing } from '@/constants/theme';

/**
 * The tab bar floats as a pill inset from the screen edges rather than filling
 * the bottom, so content has to clear its full footprint — the bar itself plus
 * the gap beneath it — not just its height.
 */
export const TabBar = {
  height: 62,
  /** Inset from the left and right screen edges. */
  inset: Spacing.lg,
  /** Gap between the bottom of the bar and the safe-area edge. */
  floatGap: Spacing.md,
} as const;

/** Bottom padding a scroll view needs so its last row clears the tab bar. */
export function tabBarClearance(safeAreaBottom: number): number {
  return safeAreaBottom + TabBar.height + TabBar.floatGap + Spacing.lg;
}
