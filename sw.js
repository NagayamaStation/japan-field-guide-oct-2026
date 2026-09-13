const VERSION='japan-field-guide-ca3eae84cbf3';
const ASSETS=["./","./app.js","./assets/ako-1.webp","./assets/ako-2.webp","./assets/ako-3.webp","./assets/circuit-1.webp","./assets/circuit-2.webp","./assets/circuit-3.webp","./assets/ena-1.webp","./assets/ena-2.webp","./assets/ena-3.webp","./assets/fujinomiya-1.webp","./assets/fujinomiya-2.webp","./assets/fujinomiya-3.webp","./assets/haruna-1.webp","./assets/haruna-2.webp","./assets/haruna-3.webp","./assets/hashimoto-1.webp","./assets/hashimoto-2.webp","./assets/hashimoto-3.webp","./assets/himeji-1.webp","./assets/himeji-2.webp","./assets/himeji-3.webp","./assets/honjo-1.webp","./assets/honjo-2.webp","./assets/honjo-3.webp","./assets/maizuru-1.webp","./assets/maizuru-2.webp","./assets/maizuru-3.webp","./assets/osaka-1.webp","./assets/osaka-2.webp","./assets/osaka-3.webp","./assets/sekigahara-1.webp","./assets/sekigahara-2.webp","./assets/sekigahara-3.webp","./assets/tsuyama-1.webp","./assets/tsuyama-2.webp","./assets/tsuyama-3.webp","./assets/yokai-a.png","./assets/yokai-b.png","./assets/yokai-c.png","./data.js","./icon.svg","./index.html","./manifest.webmanifest","./panorama.png","./styles.css","./theme.js"];
async function tell(client){
  const cache=await caches.open(VERSION);
  const ready=(await Promise.all(ASSETS.map(url=>cache.match(new URL(url,self.registration.scope).href)))).every(Boolean);
  if(client)client.postMessage({type:'GUIDE_STATUS',ready});
}
self.addEventListener('install',event=>{
  event.waitUntil((async()=>{
    const cache=await caches.open(VERSION);
    for(const path of ASSETS){
      const request=new Request(new URL(path,self.registration.scope),{cache:'reload',credentials:'same-origin'});
      const response=await fetch(request);
      if(!response.ok||response.redirected||response.type==='opaque')throw new Error('Guide asset unavailable: '+path);
      await cache.put(request,response);
    }
    await self.skipWaiting();
  })());
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith('japan-field-guide-')&&key!==VERSION)await caches.delete(key);
    await self.clients.claim();
    for(const client of await self.clients.matchAll())await tell(client);
  })());
});
self.addEventListener('message',event=>{
  if(event.data&&event.data.type==='CHECK_GUIDE')event.waitUntil(tell(event.source));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith((async()=>{
      try{return await fetch(event.request);}
      catch{
        const cache=await caches.open(VERSION);
        return await cache.match(new URL('./index.html',self.registration.scope).href)||Response.error();
      }
    })());
  }else if(ASSETS.some(path=>new URL(path,self.registration.scope).pathname===url.pathname)){
    event.respondWith((async()=>{
      const cache=await caches.open(VERSION);
      return await cache.match(event.request)||fetch(event.request);
    })());
  }
});
