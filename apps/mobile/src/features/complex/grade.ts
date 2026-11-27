import { parkingGrade } from '@ulsan/shared';

import type { Palette } from '@/theme/colors';

export function gradeColor(perHousehold: number | undefined, c: Palette) {
  const g = perHousehold != null ? parkingGrade(perHousehold) : null;
  return g === 'plenty' ? c.good : g === 'normal' ? c.warn : g === 'short' ? c.bad : c.textSub;
}
