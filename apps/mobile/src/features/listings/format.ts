import { formatManwon } from '@ulsan/shared';

import type { SavedListing } from '@/stores/listings';

export const DEAL_LABEL = { sale: '매매', jeonse: '전세', monthly: '월세' } as const;

export function listingPriceText(l: Pick<SavedListing, 'price' | 'dealType' | 'monthlyRent'>) {
  if (l.price == null) return '가격 미입력';
  return l.dealType === 'monthly' ? `${formatManwon(l.price)} / 월 ${l.monthlyRent ?? '-'}만` : formatManwon(l.price);
}
