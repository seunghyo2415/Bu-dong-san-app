/**
 * 보이지 않는 WebView 에서 카카오맵 JS SDK 의 장소 검색(services.Places)을 실행한다.
 * 공개용 JavaScript 키만 쓰므로 서버 없이 동작. (허용 도메인 https://localhost 등록 필요)
 *
 * 앱 → 웹: window.__req({ id, kind: 'keyword'|'category'|'address', query?, code?, lat?, lng?, radius?, size?, sort? })
 * 웹 → 앱: { type: 'ready' } | { type: 'res', id, ok, places?, total?, error? } | { type: 'error', message }
 */
export function buildKakaoServicesHtml(appKey: string) {
  return `<!doctype html><html><head><meta charset="utf-8"/></head><body>
<script>
(function () {
  var ps = null, gc = null, queue = [];
  function send(m) { window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  function run(r) {
    var opts = { size: r.size || 15 };
    if (r.lat != null && r.lng != null) {
      opts.location = new kakao.maps.LatLng(r.lat, r.lng);
      opts.radius = Math.min(r.radius || 5000, 20000);
      opts.sort = r.sort === 'accuracy' ? kakao.maps.services.SortBy.ACCURACY : kakao.maps.services.SortBy.DISTANCE;
    }
    var cb = function (data, status, pagination) {
      if (status === kakao.maps.services.Status.ERROR) return send({ type: 'res', id: r.id, ok: false, error: 'search error' });
      var places = (data || []).map(function (d) {
        return { id: d.id, name: d.place_name, address: d.road_address_name || d.address_name, category: d.category_name,
                 group: d.category_group_code, lat: Number(d.y), lng: Number(d.x), distance: d.distance ? Number(d.distance) : null, url: d.place_url };
      });
      send({ type: 'res', id: r.id, ok: true, places: places, total: pagination ? pagination.totalCount : places.length });
    };
    try {
      if (r.kind === 'address') {
        // 주소 → 좌표 (도로명·지번 주소)
        gc.addressSearch(r.query, function (data, status) {
          if (status === kakao.maps.services.Status.ERROR) return send({ type: 'res', id: r.id, ok: false, error: 'address error' });
          var places = (data || []).slice(0, 3).map(function (d) {
            return { id: 'addr-' + d.x + ',' + d.y, name: (d.road_address && d.road_address.building_name) || d.address_name, address: d.address_name,
                     category: '주소', group: '', lat: Number(d.y), lng: Number(d.x), distance: null, url: '' };
          });
          send({ type: 'res', id: r.id, ok: true, places: places, total: places.length });
        });
        return;
      }
      if (r.kind === 'category') ps.categorySearch(r.code, cb, opts);
      else ps.keywordSearch(r.query, cb, opts);
    } catch (e) { send({ type: 'res', id: r.id, ok: false, error: String(e) }); }
  }
  window.__req = function (r) { if (ps) run(r); else queue.push(r); };
  var s = document.createElement('script');
  s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&libraries=services&appkey=' + encodeURIComponent(${JSON.stringify(appKey).replace(/</g, '\\u003c')});
  s.onerror = function () { send({ type: 'error', message: '카카오 SDK를 불러오지 못했어요' }); };
  s.onload = function () {
    if (!window.kakao || !kakao.maps) return send({ type: 'error', message: '카카오 키 또는 허용 도메인을 확인하세요' });
    kakao.maps.load(function () { ps = new kakao.maps.services.Places(); gc = new kakao.maps.services.Geocoder(); send({ type: 'ready' }); queue.splice(0).forEach(run); });
  };
  document.head.appendChild(s);
})();
</script></body></html>`;
}
