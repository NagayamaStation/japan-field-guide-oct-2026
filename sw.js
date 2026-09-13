const VERSION='japan-field-guide-327d3802755a';
const ASSETS=['./','./index.html','./styles.css','./data.js','./app.js','./theme.js','./manifest.webmanifest','./icon.svg','./panorama.png'];
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
