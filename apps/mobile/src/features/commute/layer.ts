import type { CommuteRoute } from '@ulsan/shared';

import type { BusLayer } from '@/features/map/KakaoMap';
import { COMPANY_WORD, routePath, type StopGeo } from '@/stores/commute';

const COLORS = ['#E8590C', '#1C7ED6', '#2F9E44', '#AE3EC9', '#F08C00', '#0CA678', '#D6336C', '#5C7CFA'];

/** 지도에 그릴 노선 (지역별 색) */
export function buildBusLayer(routes: CommuteRoute[], stops: Record<string, StopGeo>, company: { name: string; location: { lat: number; lng: number } | null }): BusLayer {
  const regions = [...new Set(routes.map((r) => r.region))];
  return routes
    .map((r) => {
      const color = COLORS[regions.indexOf(r.region) % COLORS.length];
      const path = routePath(r, stops, company);
      const times = r.departures.map((d) => `${d.boardAt} ${[d.shift1 && `1조 ${d.shift1}`, d.shift2 && `2조 ${d.shift2}`].filter(Boolean).join(' / ')}`).join('\n');
      return {
        color,
        path: path.map((p) => p.location),
        stops: path
          .filter((p) => p.name !== COMPANY_WORD)
          .map((p) => ({ name: p.name, lat: p.location.lat, lng: p.location.lng, info: `${p.name}\n[${r.region}] 출발\n${times}` })),
      };
    })
    .filter((r) => r.path.length >= 2);
}
