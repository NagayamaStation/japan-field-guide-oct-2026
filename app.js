(() => {
  'use strict';
  const guide = window.FIELD_GUIDE;
  const main = document.getElementById('main');
  if (!guide || !Array.isArray(guide.stops)) {
    main.innerHTML = '<p class="notice">The guide did not finish loading. Please reconnect and reload this page.</p>';
    return;
  }
  const stops = guide.stops;
  const active = stops.filter(s => s.type !== 'alternative');
  const getStop = id => stops.find(s => s.id === id);
  const escape = text => String(text == null ? '' : text).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const weekday = (day,short=false) => new Intl.DateTimeFormat('en-GB',{weekday:short?'short':'long',timeZone:'UTC'}).format(new Date(Date.UTC(2026,9,day)));
  const date = day => weekday(day) + ' ' + day + ' October';
  const map = query => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
  const stopMap = s => map((s.hotel ? s.hotel + ', ' : '') + s.address);
  const link = (url,label,cls='maps-button') => '<a class="' + cls + '" href="' + escape(url) + '" target="_blank" rel="noopener noreferrer">' + label + '<span aria-hidden="true">↗</span></a>';
  const theme = s => '--region:' + s.color + ';--accent:' + s.accent + ';--crop:' + s.crop;
  const safeStorage = {
    get(key){try{return localStorage.getItem(key);}catch{return null;}},
    set(key,value){try{localStorage.setItem(key,value);}catch{}}
  };
  const panels = ['explore','reports','travel'];
  let current = {view:'route',id:null,panel:'explore'};
  let workerRegistration = null;
  let installPrompt = null;
  let savedOffline = false;
  let renderingStarted = false;

  function dates(s){
    if (!s.end) return '<div class="date-pair"><div><span class="date-label">Visit on</span><strong class="date-value">' + weekday(s.day) + '<br><span class="big-day">' + s.day + ' October</span></strong></div><div><span class="date-label">Overnight</span><strong class="date-value">No stay here</strong></div></div>';
    return '<div class="date-pair"><div><span class="date-label">Check in</span><strong class="date-value">' + weekday(s.day) + '<br><span class="big-day">' + s.day + ' October</span></strong>' + (s.checkin?'<span class="clock">From ' + s.checkin + '</span>':'') + '</div><div><span class="date-label">Check out</span><strong class="date-value">' + weekday(s.end) + '<br><span class="big-day">' + s.end + ' October</span></strong>' + (s.checkout?'<span class="clock">By ' + s.checkout + '</span>':'') + '</div></div>';
  }
  function card(s,index){
    return '<a class="stop-card" style="' + theme(s) + '" href="#stop/' + s.id + '/explore"><span class="card-art" aria-hidden="true"></span><span class="date-tile"><span class="weekday">' + weekday(s.day,true).toUpperCase() + '</span><span class="day-number">' + s.day + '</span><span class="month">OCT</span></span><span class="card-body"><span class="card-region">' + s.region + ' · ' + s.ja + '</span><strong class="card-title">' + s.title + '</strong><span class="card-description">' + s.label + '</span><span class="card-footer"><span>' + (s.type==='alternative'?'Still booked · alternative':s.end?(s.end-s.day)+' night'+(s.end-s.day>1?'s':'')+' · leave '+weekday(s.end,true)+' '+s.end:'En-route visit') + '</span><span class="card-arrow" aria-hidden="true">↗</span></span></span></a>';
  }
  function renderRoute(){
    const last = getStop(safeStorage.get('japan-guide-last-stop'));
    const alt = getStop('ako');
    return '<section class="overview-hero"><img class="hero-art" src="./panorama.png" alt="Illustrated Japanese mountain road, castle and coastal landscape" fetchpriority="high"><div><span class="eyebrow">OCTOBER 2026 · POCKET EDITION</span><h1>The road book.</h1><p class="hero-date">13–22 October <span>Honjo → Honjo</span></p></div></section>' +
      (last?'<a class="resume" href="#stop/'+last.id+'/explore">Continue in '+last.title+' <span aria-hidden="true">→</span></a>':'') +
      '<div class="overview-bar"><h2>Your route</h2><nav class="toolbar" aria-label="Quick access"><a class="pill-link" href="#hotels">All hotels</a><a class="pill-link dark" href="#return">Return the car</a></nav></div>' +
      '<section class="stop-grid" aria-label="Stops in travel order">'+active.map(card).join('')+'</section>' +
      '<a class="return-strip" href="#return"><span><span class="eyebrow">CAR RETURN · HONJO</span><strong>Thursday 22 October</strong></span><span class="return-time">18:30 ↗</span></a>' +
      '<section class="alternative-block"><h2>Also still booked</h2><p>Keep the Ako onsen reservation until you have discussed it. Himeji is the intended overnight on 17 October.</p>'+card(alt)+'</section>';
  }
  function fold(title,body,classes='',open=false){
    if (!body) return '';
    return '<details class="fold '+classes+'"'+(open?' open':'')+'><summary>'+title+'</summary><div class="fold-content prose">'+body+'</div></details>';
  }
  function renderExplore(s){
    const sect=s.sections;
    const intro = (sect['The area']||'').match(/<p>.*?<[/]p>/);
    const history=(sect['The area']||'')+(sect['Why it matters']||'')+(sect['Local tradition']||'')+(sect['Local character']||'');
    let picks=sect['Three picks']||sect['Three picks in the circuit area']||'';
    let pickBlocks='';
    const matches=[...picks.matchAll(/<li>(.*?)<[/]li>/g)];
    if (matches.length){
      pickBlocks='<h2 class="section-label">Three places to consider</h2>'+matches.map((m,i)=>{
        const title=m[1].match(/^<strong>(.*?)<[/]strong>/);
        return fold('<span><span class="fold-number">0'+(i+1)+'</span>'+(title?title[1]:'Visit '+(i+1))+'</span>',title?'<p>'+m[1].slice(title[0].length).trim()+'</p>':m[1]);
      }).join('');
    }
    return (intro?'<div class="prose">'+intro[0]+'</div>':'') + pickBlocks +
      fold('The area & its history',history) + fold('A manageable visit',sect['A manageable visit']||'');
  }
  function renderReports(s){
    const sect=s.sections;
    const content=sect['YOKAI ALERT']||'';
    const coverage=content.match(/^<p>.*?<[/]p>/);
    return '<div class="coverage">'+(coverage?coverage[0]:'')+'</div>' +
      fold('<span><span class="report-kicker">FIELD REPORT 01</span><span class="report-title">YOKAI ALERT</span></span>',coverage?content.slice(coverage[0].length):content,'report-fold')+
      fold('<span><span class="report-kicker">FIELD REPORT 02</span><span class="report-title">NINJA WARNING REPORT</span></span>',sect['NINJA WARNING REPORT'],'report-fold ninja')+
      fold('<span><span class="report-kicker">FIELD REPORT 03</span><span class="report-title">SPECIAL CONCERNS</span></span>',sect['SPECIAL CONCERNS'],'report-fold concerns');
  }
  function drivingLink(s){
    const originByStop={
      ena:guide.returnCar.name+', '+guide.returnCar.address,
      sekigahara:getStop('ena').hotel+', '+getStop('ena').address,
      maizuru:getStop('sekigahara').address,
      tsuyama:getStop('maizuru').hotel+', '+getStop('maizuru').address,
      circuit:getStop('tsuyama').hotel+', '+getStop('tsuyama').address,
      himeji:getStop('circuit').address,
      ako:getStop('circuit').address,
      osaka:getStop('himeji').hotel+', '+getStop('himeji').address,
      fujinomiya:getStop('osaka').hotel+', '+getStop('osaka').address,
      hashimoto:getStop('fujinomiya').hotel+', '+getStop('fujinomiya').address,
      haruna:getStop('hashimoto').hotel+', '+getStop('hashimoto').address
    };
    if(!originByStop[s.id]) return null;
    let url='https://www.google.com/maps/dir/?api=1&travelmode=driving&origin='+encodeURIComponent(originByStop[s.id])+'&destination='+encodeURIComponent((s.hotel?s.hotel+', ':'')+s.address);
    if(s.id==='haruna') url+='&waypoints='+encodeURIComponent('伊香保温泉石段街, Shibukawa, Gunma');
    return url;
  }
  function renderTravel(s){
    let extra='';
    if(s.id==='honjo') extra='<div class="notice"><strong>Car pickup:</strong> Wednesday 14 October, 09:30.<br><strong>Car return:</strong> Thursday 22 October, 18:30.<br>Use Toyota Rent a Car Honjowaseda Station Shop, 1-9-41 Wasedanomori.</div>'+link(map(guide.returnCar.name+', '+guide.returnCar.address),'Toyota rental branch','maps-button secondary');
    if(s.id==='ena') extra='<div class="notice"><strong>Correct hotel: Route-Inn Ena.</strong> The R9 The Yard pin in the shared map is incorrect. The Route 142 crossing between Saku and Okaya is part of the inland journey.</div>';
    if(s.id==='sekigahara') extra='<div class="notice">This Maps link targets the decisive-battle site. Choose the exact visitor parking when navigating. The earlier shared map named Sekigahara town.</div>';
    if(s.id==='haruna') extra='<div class="notice"><strong>Leave time for the return:</strong> fuel and handover in Honjo are still ahead. Aim to reach Honjo around 17:00, before the 18:30 deadline.</div>'+link(map(guide.returnCar.name+', '+guide.returnCar.address),'Car return in Honjo','maps-button secondary');
    const drive=drivingLink(s);
    return '<section class="route-box"><span class="eyebrow">'+(s.hotel?'YOUR HOTEL':'VISITOR DESTINATION')+'</span><h3>'+escape(s.hotel||s.title)+'</h3><p class="address">'+escape(s.address)+'</p><button type="button" class="copy-address" data-copy="'+escape(s.address)+'">Copy address</button>'+link(stopMap(s),'Open in Google Maps')+'</section>'+
      '<section class="route-box"><span class="eyebrow">THIS LEG</span><h3>'+escape(s.route)+'</h3><p>'+escape(s.drive)+'</p>'+(drive?link(drive,'Open the drive','maps-button secondary'):'')+'</section>'+extra+
      '<p class="small-note">Maps chooses the current route. Sightseeing, breaks and additional stops take extra time.</p>';
  }
  function renderStop(s,panel){
    const n=active.findIndex(x=>x.id===s.id);
    const before=n>0?active[n-1]:null, after=n>=0?active[n+1]:null;
    const body=panel==='reports'?renderReports(s):panel==='travel'?renderTravel(s):renderExplore(s);
    const notice=s.notice?'<div class="notice">'+escape(s.notice)+'</div>':'';
    return '<article style="'+theme(s)+'"><div class="chapter-top"><a class="back-link" href="#route"><span aria-hidden="true">←</span> All stops</a><span class="chapter-count">'+(n<0?'RETAINED ALTERNATIVE':'STOP '+String(n+1).padStart(2,'0')+' / '+active.length)+'</span></div>'+
      '<header class="chapter-hero"><img class="hero-art" src="./panorama.png" alt="" style="object-position:'+s.crop+'"><span class="japanese" aria-hidden="true">'+s.ja+'</span><span class="eyebrow">'+s.region+' · '+weekday(s.day,true).toUpperCase()+' '+s.day+' OCT</span><h1>'+s.title+'</h1><p>'+s.label+'</p></header>'+
      '<div class="chapter-layout"><div class="chapter-main"><nav class="panel-nav" aria-label="Chapter sections">'+panels.map(p=>'<a href="#stop/'+s.id+'/'+p+'"'+(panel===p?' aria-current="page"':'')+'>'+({explore:'Explore',reports:'Field reports',travel:'Stay & drive'}[p])+'</a>').join('')+'</nav><section id="chapter-content" aria-label="'+({explore:'Explore '+s.title,reports:'Field reports for '+s.title,travel:'Travel details for '+s.title}[panel])+'">'+body+'</section></div>'+
      '<aside class="trip-aside"><section class="stay-card"><span class="eyebrow">'+(s.type==='alternative'?'STILL BOOKED':s.end?'YOUR STAY':'ON THE WAY')+'</span><h2>'+escape(s.hotel||s.title+' · day visit')+'</h2>'+dates(s)+(s.end?'<p class="night-note">'+(s.end-s.day)+' night'+(s.end-s.day>1?'s':'')+' · October 2026</p>':'')+link(stopMap(s),s.hotel?'Hotel in Maps':'Stop in Maps')+'</section>'+notice+'</aside></div>'+
      '<nav class="chapter-bottom" aria-label="Previous and next stop">'+(before?'<a href="#stop/'+before.id+'/explore"><span>← Previous stop</span><strong>'+before.title+'</strong></a>':'<a href="#route"><span>← Trip overview</span><strong>All stops</strong></a>')+(after?'<a href="#stop/'+after.id+'/explore"><span>Next stop →</span><strong>'+after.title+'</strong></a>':'<a href="#return"><span>Finish the drive →</span><strong>Car return</strong></a>')+'</nav></article>';
  }
  function booking(s){
    return '<article class="booking-card" style="--region:'+(s.color||'#24488c')+'">'+(s.type==='alternative'?'<span class="booking-status">Still booked · retained alternative</span>':'')+'<h2>'+escape(s.title)+'</h2><h3>'+escape(s.hotel)+'</h3>'+dates(s)+(s.notice?'<div class="notice">'+escape(s.notice)+'</div>':'')+'<p class="address">'+escape(s.address)+'</p>'+link(stopMap(s),'Hotel in Maps')+'</article>';
  }
  function renderHotels(){
    return '<div class="chapter-top"><a href="#route" class="back-link">← All stops</a></div><header class="bookings-title"><span class="eyebrow">9–27 OCTOBER 2026</span><h1>Your hotels.</h1><p>Check-in and checkout are shown separately. Intentional duplicate and parallel IHG bookings are preserved.</p></header><h2 class="booking-caption">Before the drive</h2><div class="booking-grid">'+booking(guide.outside[0])+'</div><h2 class="booking-caption">The driving loop</h2><div class="booking-grid">'+stops.filter(s=>s.hotel).sort((a,b)=>a.day-b.day).map(booking).join('')+'</div><h2 class="booking-caption">After the drive</h2><div class="booking-grid">'+guide.outside.slice(1).map(booking).join('')+'</div>';
  }
  function renderReturn(){
    return '<section class="return-page"><div class="chapter-top"><a href="#route" class="back-link">← All stops</a></div><span class="eyebrow">FINISH IN HONJO</span><h1>Return the Yaris.</h1><div class="return-deadline"><span class="eyebrow">THURSDAY 22 OCTOBER 2026</span><p class="deadline-time">18:30</p><p class="deadline-day">Return by 6:30 p.m.</p><p class="deadline-alt">Aim to arrive around 17:00.</p></div><div class="route-box"><h2>'+guide.returnCar.name+'</h2><p class="address">'+guide.returnCar.address+'</p><button class="copy-address" type="button" data-copy="'+guide.returnCar.address+'">Copy address</button>'+link(map(guide.returnCar.name+', '+guide.returnCar.address),'Open rental branch in Maps')+'<a class="maps-button secondary" href="tel:+81495243100">Call the branch <span>'+guide.returnCar.phone+'</span></a></div><p class="small-note">This is the same branch used for pickup on Wednesday 14 October at 09:30. Leave time for fuel and the handover after Haruna.</p><a class="pill-link" href="#stop/haruna/travel">Haruna → Honjo details</a></section>';
  }
  function route(){
    const parts=location.hash.slice(1).split('/');
    const old=current;
    const requested=parts[0]||'route';
    if(requested==='stop'&&getStop(parts[1])){
      current={view:'stop',id:parts[1],panel:panels.includes(parts[2])?parts[2]:'explore'};
      const s=getStop(current.id);
      main.innerHTML=renderStop(s,current.panel);
      document.title=s.title+' · Japan Field Guide';
      safeStorage.set('japan-guide-last-stop',s.id);
      document.querySelector('meta[name="theme-color"]').content=s.color;
    }else{
      current={view:['hotels','return'].includes(requested)?requested:'route',id:null,panel:'explore'};
      main.innerHTML=current.view==='hotels'?renderHotels():current.view==='return'?renderReturn():renderRoute();
      document.title='Japan Field Guide · October 2026';
      document.querySelector('meta[name="theme-color"]').content='#142841';
    }
    if(renderingStarted){
      if(old.view==='stop'&&current.view==='stop'&&old.id===current.id){
        const nav=main.querySelector('.panel-nav');
        if(nav) nav.scrollIntoView({behavior:'instant',block:'start'});
        const focused=main.querySelector('.panel-nav [aria-current="page"]');
        if(focused) focused.focus({preventScroll:true});
      }else{
        window.scrollTo({top:0,behavior:'instant'});
        main.focus({preventScroll:true});
      }
    }
    renderingStarted=true;
  }
  window.addEventListener('hashchange',route);
  document.querySelector('.skip-link').addEventListener('click',event=>{event.preventDefault();main.focus();});
  main.addEventListener('click',async event=>{
    const button=event.target.closest('[data-copy]');
    if(!button)return;
    try{
      if(navigator.clipboard&&window.isSecureContext){
        await navigator.clipboard.writeText(button.dataset.copy);
        button.textContent='Address copied';
      }else{
        button.textContent='Select the address above to copy';
      }
    }catch{button.textContent='Select the address above to copy';}
  });

  const dialog=document.getElementById('phone-dialog');
  document.getElementById('save-guide').addEventListener('click',()=>{
    dialog.showModal();
    updateOfflineText();
    if(workerRegistration&&workerRegistration.active)workerRegistration.active.postMessage({type:'CHECK_GUIDE'});
  });
  document.getElementById('close-phone').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();installPrompt=event;
    document.getElementById('install-app').hidden=false;
  });
  document.getElementById('install-app').addEventListener('click',async()=>{
    if(!installPrompt)return;
    await installPrompt.prompt();
    installPrompt=null;document.getElementById('install-app').hidden=true;
  });
  function updateOfflineText(){
    document.getElementById('offline-status').textContent=savedOffline?(navigator.onLine?'Saved on this device':'Offline · saved guide'):navigator.onLine?'Pocket edition':'Offline copy unavailable';
    document.getElementById('cache-message').textContent=savedOffline?'Every chapter, report and background is saved on this device for offline reading.':workerRegistration?'Saving the guide for offline reading. Keep this page open until it confirms it is saved.':'Open the hosted guide while online to prepare the offline copy.';
  }
  window.addEventListener('online',updateOfflineText);
  window.addEventListener('offline',updateOfflineText);
  if('serviceWorker' in navigator&&window.isSecureContext){
    navigator.serviceWorker.addEventListener('message',event=>{
      if(event.data&&event.data.type==='GUIDE_STATUS'){
        savedOffline=event.data.ready===true;updateOfflineText();
        if(event.data.error)document.getElementById('cache-message').textContent='The offline copy could not be completed. Reconnect and reload the guide to try again.';
      }
    });
    navigator.serviceWorker.register('./sw.js').then(async reg=>{
      workerRegistration=reg;
      const ready=await navigator.serviceWorker.ready;
      ready.active.postMessage({type:'CHECK_GUIDE'});
      updateOfflineText();
    }).catch(()=>{document.getElementById('cache-message').textContent='Offline saving is unavailable in this browser. You can still bookmark and read the guide online.';});
  }
  route();

  // Imperative tools use the same navigation and data as the visible guide.
  if(navigator.modelContext&&navigator.modelContext.registerTool){registerTools(navigator.modelContext);}
  else if(document.modelContext&&document.modelContext.registerTool){registerTools(document.modelContext);}
  function registerTools(context){
    const lifecycle=new AbortController();
    const register=tool=>{try{Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{}};
    register({name:'list_trip_stops',title:'List road-trip stops',description:'Read the stops, dates, current hotel names and booking status in this pocket guide.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(){return stops.map(s=>({id:s.id,name:s.title,checkIn:s.day,checkOut:s.end,month:'October 2026',hotel:s.hotel,type:s.type,notice:s.notice||null}));}});
    register({name:'open_trip_stop',title:'Open a trip stop',description:'Navigate this pocket guide to a stop and its Explore, Field reports or Stay and drive panel. Does not change bookings.',inputSchema:{type:'object',properties:{stopId:{type:'string',enum:stops.map(s=>s.id)},panel:{type:'string',enum:panels}},required:['stopId'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!getStop(input.stopId)||input.panel&&!panels.includes(input.panel))throw new Error('Choose a listed stop and panel.');const panel=input.panel||'explore';location.hash='stop/'+input.stopId+'/'+panel;route();return {stopId:current.id,panel:current.panel,title:getStop(current.id).title};}});
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
})();
