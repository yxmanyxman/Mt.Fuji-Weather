// 富士山天气 PWA Service Worker —— 缓存应用外壳，弱网/离线可打开
const CACHE='fuji-weather-v1';
const SHELL=[
  './','./index.html','./manifest.webmanifest',
  './icon-192.png','./icon-512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.5.0/dist/chart.umd.js'
];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()).catch(()=>{}));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  // 天气接口不走 SW 缓存（页面用 localStorage 兜底）
  if(u.hostname.indexOf('open-meteo.com')!==-1)return;
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(resp=>{
      if(u.origin===location.origin||u.hostname.indexOf('jsdelivr')!==-1){
        const copy=resp.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
      }
      return resp;
    }).catch(()=>caches.match('./index.html')))
  );
});
