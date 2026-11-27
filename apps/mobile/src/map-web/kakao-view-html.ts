/**
 * 작은 지도(움직이지 않음) 또는 로드뷰 한 장면.
 * 로드뷰는 단지에서 가장 가까운 로드뷰 지점(100m 이내)을 찾아, 단지 쪽을 바라보게 시점을 맞춘다.
 * 웹 → 앱: { type: 'ready' } | { type: 'no-roadview' } | { type: 'error', message }
 */
export function buildKakaoViewHtml(opts: { appKey: string; lat: number; lng: number; mode: 'minimap' | 'roadview'; name: string }) {
  const init = JSON.stringify(opts).replace(/</g, '\\u003c'); // </script> 탈출 방지
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"/>
<style>html,body,#v{margin:0;padding:0;width:100%;height:100%;background:#ddd}
.pin{background:#1F6FEB;color:#fff;font:600 12px sans-serif;padding:5px 8px;border-radius:8px;white-space:nowrap;transform:translateY(-6px)}</style>
</head><body><div id="v"></div><script>
(function(){
  var I = ${init};
  function send(m){ window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify(m)); }
  var s = document.createElement('script');
  s.src = 'https://dapi.kakao.com/v2/maps/sdk.js?autoload=false&appkey=' + encodeURIComponent(I.appKey);
  s.onerror = function(){ send({ type: 'error', message: '카카오 SDK를 불러오지 못했어요' }); };
  s.onload = function(){
    if (!window.kakao || !kakao.maps) return send({ type: 'error', message: '카카오 키 또는 허용 도메인을 확인하세요' });
    kakao.maps.load(function(){
      var pos = new kakao.maps.LatLng(I.lat, I.lng), el = document.getElementById('v');
      if (I.mode === 'minimap') {
        var map = new kakao.maps.Map(el, { center: pos, level: 3, draggable: false, scrollwheel: false, disableDoubleClickZoom: true });
        var pin = document.createElement('div'); pin.className = 'pin'; pin.textContent = I.name;
        new kakao.maps.CustomOverlay({ position: pos, content: pin, yAnchor: 1 }).setMap(map);
        send({ type: 'ready' });
        return;
      }
      var rv = new kakao.maps.Roadview(el), rc = new kakao.maps.RoadviewClient();
      rc.getNearestPanoId(pos, 100, function(panoId){
        if (panoId === null) return send({ type: 'no-roadview' });
        rv.setPanoId(panoId, pos);
      });
      kakao.maps.event.addListener(rv, 'init', function(){
        var p = rv.getPosition();
        var y = Math.sin((I.lng - p.getLng()) * Math.PI / 180) * Math.cos(I.lat * Math.PI / 180);
        var x = Math.cos(p.getLat() * Math.PI / 180) * Math.sin(I.lat * Math.PI / 180) -
                Math.sin(p.getLat() * Math.PI / 180) * Math.cos(I.lat * Math.PI / 180) * Math.cos((I.lng - p.getLng()) * Math.PI / 180);
        var pan = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
        rv.setViewpoint({ pan: pan, tilt: 0, zoom: 0 });
        send({ type: 'ready' });
      });
    });
  };
  document.head.appendChild(s);
})();
</script></body></html>`;
}
