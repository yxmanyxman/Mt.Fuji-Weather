// 富士山天气 PWA Service Worker
// 策略：页面文档用「网络优先」(部署即时生效，断网回退缓存)；
//      静态资源(图标/Chart.js)用「先缓存、后台更新」；天气接口不经 SW(页面用 localStorage 兜底)。
const VERSION='v3';
const CACHE='fuji-weather-'+VERSION;
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './icon-192.png','./icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // 天气接口：始终走网络（页面自带 localStorage 兜底）
  if(u.hostname.indexOf('open-meteo.com')!==-1)return;
  const isDoc = e.request.mode==='navigate'
    || u.pathname.endsWith('/') || u.pathname.endsWith('index.html')
    || u.pathname.endsWith('manifest.webmanifest');
  if(isDoc){
    // 网络优先：联网时永远取最新部署，失败才用缓存
    e.respondWith(
      fetch(e.request).then(resp=>{
        const copy=resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        return resp;
      }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html')))
    );
    return;
  }
  // 静态资源：先用缓存，同时后台拉新版更新缓存
  e.respondWith(
    caches.match(e.request).then(hit=>{
      const net=fetch(e.request).then(resp=>{
        if(u.origin===location.origin||u.hostname.indexOf('jsdelivr')!==-1){
          const copy=resp.clone();
          caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
        }
        return resp;
      }).catch(()=>hit);
      return hit||net;
    })
  );
});
