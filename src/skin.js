function installYanamiNative(assets,openings,gsap,timelines,startupId) {
  if (window.__yanamiNative?.build==='approved-v3'&&window.__yanamiNative?.revision==='stable-v5') {window.__yanamiNative.startSession(startupId);return window.__yanamiNative.status();}
  window.__yanamiNative?.remove();
  if(!document.body||!document.head)return {waitingForDocument:true};
  const composerSelector=':is(.composer-surface-chrome,[class*="_ComposerLayoutRoot_"],[data-composer-surface-variant][data-composer-radius-variant])';
  const mainSelector='main:is(.main-surface,[data-app-shell-main-surface],[class*="_MainContentSurface_"])';
  const messageSelector='[data-message-author-role],[data-local-conversation-user-anchor],[data-local-conversation-final-assistant]';
  const originalAttributes=new Map(),originalReserve=new Map(),originalVariables=new Map();
  function nativeVar(el,name,value){if(!originalVariables.has(el))originalVariables.set(el,new Map());const saved=originalVariables.get(el);if(!saved.has(name))saved.set(name,[el.style.getPropertyValue(name),el.style.getPropertyPriority(name)]);el.style.setProperty(name,value);}
  const mark=(el,name)=>{if(!el)return;if(!originalAttributes.has(el))originalAttributes.set(el,new Map());const saved=originalAttributes.get(el);if(!saved.has(name))saved.set(name,el.getAttribute(name));el.setAttribute(name,'');};
  const restoreMarks=()=>{for(const[el,attrs]of originalAttributes)for(const[name,value]of attrs)value===null?el.removeAttribute(name):el.setAttribute(name,value);originalAttributes.clear();};
  let prefs={theme:'ink',art:'profile',whiteArt:'cutout',inkArt:'profile',show:true,strength:100,breath:true,product:'auto'};
  try{Object.assign(prefs,JSON.parse(localStorage.getItem('yanami-native-theme-v1')||'{}'));}catch{}
  if(!assets[prefs.art])prefs={theme:'ink',art:'profile'};
  const host=document.createElement('div');host.id='yanami-native-theme';host.style.cssText='position:fixed;inset:0;z-index:20;pointer-events:none;';
  const shadow=host.attachShadow({mode:'open'});
  shadow.innerHTML=`<style>
    :host{font-family:system-ui,sans-serif;color:#343434}*{box-sizing:border-box}
    #character{position:fixed;overflow:hidden;pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .35s ease}
    #character:focus-visible{outline:2px solid var(--accent);outline-offset:-3px;border-radius:10px}
    #usage-bubble{position:fixed;width:304px;max-width:calc(100vw - 32px);max-height:calc(100vh - 120px);overflow:visible;background:#fff;border:1px solid #e3e7ec;border-radius:24px 23px 25px 18px;padding:20px;box-shadow:0 12px 44px #1e293b18;pointer-events:auto;color:#343b45;transform-origin:right var(--tail-y,80px)}
    #usage-tail{position:absolute;left:calc(100% - 2px);top:calc(var(--tail-y,80px) - 13px);width:42px;height:30px;pointer-events:none;overflow:visible}#usage-tail path{fill:#fff;stroke:#e3e7ec;stroke-width:1}#usage-speaker{display:flex;align-items:center;gap:6px;color:var(--accent);font-size:10px;letter-spacing:1px;margin-bottom:8px}#usage-speaker::before{content:'';width:5px;height:5px;background:var(--accent);border-radius:50%}#usage-line{font-size:13px;line-height:1.8;margin:0 0 13px;color:#536070}#usage-content{max-height:calc(100vh - 290px);overflow:auto}#usage-bubble .usage-heading{font-size:12px!important;color:#7c8794}#usage-bubble .usage-subtitle{margin-bottom:12px!important;font-size:9px!important}
    #usage-bubble[hidden]{display:none}#usage-bubble .usage-heading{display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:500}#usage-bubble .usage-subtitle{font-size:10px;letter-spacing:.3px;color:#8b96a3;margin:3px 0 20px}#usage-content{font-size:12px;line-height:1.7}#usage-bubble .usage-window{margin:16px 0}#usage-bubble .usage-label{display:flex;justify-content:space-between;gap:12px}#usage-bubble .usage-label b{color:var(--accent);font-weight:600;font-size:15px}#usage-bubble .usage-track{height:4px;background:#edf0f3;border-radius:3px;overflow:hidden;margin:8px 0}#usage-bubble .usage-fill{height:100%;background:var(--accent);border-radius:3px}#usage-bubble .usage-reset{font-size:10px;color:#8b96a3}#usage-bubble .usage-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:18px;border-top:1px solid #edf0f3;padding-top:10px}#usage-updated{font-size:10px;color:#8b96a3}#usage-bubble button{font-size:11px;padding:5px 8px}#usage-refresh{color:var(--accent)}#usage-bubble button:disabled{opacity:.5;cursor:wait}
    #character img{height:100%;width:100%;object-fit:contain;object-position:right center;display:block}
    #character[data-art=profile] img,#character[data-art=sport] img,#character[data-art=crown] img{object-fit:cover;object-position:left top}
    #character[data-narrow=true] img{object-fit:contain!important;object-position:right center!important}
    #character[data-art=cutout] img,#character[data-art=peace] img,#character[data-art=scarf] img,#character[data-art=smile] img{mask-image:linear-gradient(#000 90%,transparent)}
    #tools{position:fixed;right:220px;top:52px;display:none;gap:14px;pointer-events:auto;background:#fffffff2;border-radius:5px;padding:3px}
    dialog{pointer-events:auto;width:min(660px,calc(100vw - 48px));max-height:calc(100vh - 70px);border:1px solid #e7ebef;border-radius:22px;padding:30px 32px;color:#344153;background:white;box-shadow:0 22px 80px #202b451f}dialog::backdrop{background:#25324a30;backdrop-filter:blur(5px)}.heading{display:flex;align-items:center;justify-content:space-between}.eyebrow{font-size:10px;letter-spacing:2px;color:#8b9bab}h2{font-size:23px;font-weight:500;margin:6px 0}.description{font-size:12px;color:#8190a0;margin:16px 0 24px}.themes{display:grid;grid-template-columns:1fr 1fr;gap:12px}.themes button{border:1px solid #e8e8e8;background:white;border-radius:13px;text-align:left;padding:15px}.themes b{font-size:20px;font-weight:500}.themes b span{font-size:9px;letter-spacing:2px;margin-left:10px;color:#91a0ad}.themes small{display:block;font-size:10px;color:#8b96a1;margin-top:9px}button[aria-pressed=true]{outline:1px solid var(--accent);background:#f5f8fb!important}.characters{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin:18px 0}.characters button{border:1px solid #e8e8e8;border-radius:11px;background:white;padding:8px}.characters img{width:100%;height:90px;object-fit:contain}.characters span{display:block;font-size:11px;margin:6px 0 2px}.row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 0;border-bottom:1px solid #edf0f4}.row small{display:block;font-size:10px;line-height:1.7;color:#8e9baa;margin-top:4px}.row select{border:1px solid #e8e8e8;border-radius:8px;background:white;padding:7px 11px}.row input[type=range]{width:125px}.row input{accent-color:var(--accent)}.note{font-size:10px;color:#8b96a3;line-height:1.8}
    @keyframes breathe{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}#character[data-breath=true] img{animation:breathe 7s ease-in-out infinite}
    #character[data-handoff=true] img{animation:none!important;transform:none!important}
    #intro-scene{position:absolute;width:1600px;height:1000px;transform-origin:top left}#bridge{position:fixed;max-width:none;object-fit:contain;pointer-events:none;z-index:3}
    button{color:inherit;background:transparent;border:0;border-radius:6px;padding:6px 9px;font:11px system-ui;cursor:pointer}button:hover{background:#f0f3f6}button:focus-visible{outline:2px solid #2866a2}
    #intro{position:fixed;inset:0;background:#fff;pointer-events:none;overflow:hidden;display:none}#skip{pointer-events:auto}
    #intro-art{position:absolute;right:0;top:0;width:42vw;height:100vh;object-fit:cover;object-position:left top}
    #intro-copy{position:absolute;left:12vw;top:36vh;width:40vw}small{letter-spacing:3px;color:#737373;font-size:11px}h1{font-size:clamp(38px,6vw,100px);line-height:1.1;font-weight:500;letter-spacing:-3px;margin:24px 0;color:var(--accent,#333)}p{font-size:20px;letter-spacing:3px}#line{height:1px;background:var(--accent,#333);width:180px;transform-origin:left;margin-top:32px}
    #skip{position:absolute;bottom:24px;left:12vw;color:#777}
    @media(prefers-reduced-motion:reduce){#character{transition:none}#character img{animation:none!important}}
  </style><div id="character" aria-hidden="true"><img alt=""></div><div id="tools"><button id="theme" title="切换白 / 墨主题"></button><button id="pose" title="切换人物">换图</button><button id="replay" title="重播开屏">开屏</button><button id="off" title="本次关闭人物与开屏">关闭</button></div><div id="intro"><img id="intro-art" alt=""><div id="intro-copy"><small id="edition"></small><h1>ChatGPT</h1><p id="tagline"></p><div id="line"></div></div><button id="skip">跳过 · Esc</button></div>`;
  document.body.append(host);
  const style=document.createElement('style');style.id='yanami-native-layout';style.textContent=`
    [data-yanami-space]{box-sizing:border-box!important;padding-right:var(--yanami-reserve)!important;background:#fff!important}
    [data-yanami-space] :is(.composer-surface-chrome,[class*="_ComposerLayoutRoot_"],[data-composer-surface-variant][data-composer-radius-variant]){background:#fff!important;border-color:var(--yanami-border,#dedede)!important;box-shadow:0 6px 24px #20202004!important}
    [data-yanami-home] [data-yanami-composer]{position:fixed!important;left:var(--yanami-left)!important;top:var(--yanami-top)!important;bottom:auto!important;width:var(--yanami-width)!important;max-width:var(--yanami-width)!important;margin:0!important;z-index:10}
    [data-yanami-home] [data-yanami-composer] :is(.composer-surface-chrome,[class*="_ComposerLayoutRoot_"],[data-composer-surface-variant][data-composer-radius-variant]){min-height:164px!important}
    [data-yanami-home] [data-yanami-heading],[data-yanami-home] [data-testid="home-icon"]{visibility:hidden!important}
  `;document.head.append(style);
  const q=id=>shadow.getElementById(id),character=q('character'),image=character.querySelector('img');
  const homeCopy=document.createElement('div');homeCopy.id='home-copy';homeCopy.style.cssText='position:fixed;display:none;pointer-events:none;';homeCopy.innerHTML='<div style="font-size:11px;color:#8591a2;margin-bottom:22px">留一点安静，给此刻的想法。</div><div id="home-headline" style="font-size:30px;line-height:1.45;font-weight:500;letter-spacing:.2px">翻开一页，继续你的故事。</div><div style="font-size:12px;color:#8a95a3;margin-top:15px">把思绪落成文字，把想法慢慢写清。</div>';shadow.append(homeCopy);
  q('tools').innerHTML='<button id="appearance">外观</button><button id="replay">▷ 启动动画</button>';
  const dialog=document.createElement('dialog');dialog.id='appearance-dialog';dialog.innerHTML=`<div class="heading"><div><span class="eyebrow">APPEARANCE</span><h2>八奈见，就在这里。</h2></div><button id="close-panel" aria-label="关闭外观设置">×</button></div><p class="description">纯白工作区。更清晰的人物，更少的装饰。</p><div class="themes"><button data-theme="white"><b>白<span>WHITE</span></b><small>杏菜蓝 · 彩色人物 · 晴天般轻快</small></button><button data-theme="ink"><b>墨<span>INK</span></b><small>石墨灰 · 黑白侧颜 · 安静的一页</small></button></div><div class="characters"></div><div class="row"><div>开屏标识<small>共用开屏与布局，适配应用标识</small></div><select id="product"><option value="auto">跟随应用</option><option value="codex">Codex</option><option value="chatgpt">ChatGPT</option></select></div><div class="row"><div>主题开屏<small>每次从原桌面图标打开时自动播放一次</small></div><button id="preview">预览开屏</button></div><div class="row"><div>显示八奈见<small>人物位于聊天区右侧，贴合窗口边缘</small></div><input type="checkbox" id="show"></div><div class="row"><div>人物清晰度<small>正文保持纯白</small></div><input type="range" id="strength" min="70" max="100"></div><div class="row"><div>轻微呼吸动态<small>只作用于人物，无鼠标特效</small></div><input type="checkbox" id="breath"></div><p class="note">输入框与聊天功能由原客户端提供，外观装饰由本地加载器提供。窗口空间不足时收起人物。</p>`;shadow.append(dialog);
  q('intro').replaceChildren();const scene=document.createElement('div');scene.id='intro-scene';const skip=document.createElement('button');skip.id='skip';skip.textContent='跳过 ↗';q('intro').append(scene,skip);const openingRoot=scene.attachShadow({mode:'open'});
  let removed=false,frame=0,home=false,visible=false,ready=false,animationToken=0,activeAnimations=[],introTimer,playing=false,playCount=0,desiredStartup=startupId,autoPending=false,timeline=null,raf=0,openingImage=null,openingPreparing=false,geometryRevision=0,artGeneration=0;
  const assetRequests=new Map();
  function ensureAsset(id){if(assets[id]?.src)return Promise.resolve(assets[id].src);if(assetRequests.has(id))return assetRequests.get(id).promise;if(typeof window.__yanamiRequestAsset!=='function')return Promise.reject(Error('asset unavailable'));let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});const timer=setTimeout(()=>{assetRequests.delete(id);reject(Error('asset timeout'));},15000);assetRequests.set(id,{promise,resolve,reject,timer});window.__yanamiRequestAsset(id);return promise;}
  function receiveAsset(id,src){if(!assets[id]||typeof src!=='string'||!src.startsWith('data:image/'))return;assets[id].src=src;const request=assetRequests.get(id);if(request){clearTimeout(request.timer);assetRequests.delete(id);request.resolve(src);}const thumb=shadow.querySelector('[data-art-choice="'+id+'"] img');if(thumb)thumb.src=src;}
  const usageBubble=document.createElement('div');usageBubble.id='usage-bubble';usageBubble.hidden=true;usageBubble.setAttribute('role','dialog');usageBubble.setAttribute('aria-label','Codex 剩余用量');usageBubble.innerHTML='<svg id="usage-tail" viewBox="0 0 42 30" aria-hidden="true"><path d="M0 1 Q15 8 40 22 Q17 27 0 27"/></svg><div id="usage-speaker">八奈见 杏菜</div><div id="usage-line">等一下，我帮你看看。</div><div class="usage-heading">剩余用量<button id="usage-close" aria-label="关闭用量气泡">×</button></div><div class="usage-subtitle">Codex · 账户共享额度</div><div id="usage-content" role="status" aria-live="polite"></div><div class="usage-footer"><span id="usage-updated"></span><button id="usage-refresh">再看一眼</button></div>';shadow.append(usageBubble);
  character.setAttribute('role','button');character.tabIndex=0;character.setAttribute('aria-label','点击八奈见，查看 Codex 剩余用量');character.setAttribute('aria-expanded','false');character.setAttribute('aria-controls','usage-bubble');character.title='点击查看剩余用量';
  let usageRequest=null,usageTimer=null,usageSeq=0,usageEntrance=null,productTimer=null,productWaitStarted=performance.now();
  function closeUsage(focus=false){usageEntrance?.cancel();usageEntrance=null;usageBubble.hidden=true;usageRequest=null;clearTimeout(usageTimer);character.setAttribute('aria-expanded','false');if(!playing)host.style.zIndex='20';if(focus&&visible)character.focus({preventScroll:true});}
  function positionUsage(){
    if(usageBubble.hidden)return;
    // Mouth anchors in each cutout's original image coordinates; account for
    // contain/cover and object-position rather than anchoring to its empty box.
    const anchors={cutout:[.48,.35],peace:[.58,.34],crown:[.50,.21],profile:[.47,.46],scarf:[.54,.46],sport:[.56,.32],smile:[.53,.46]};
    const r=image.getBoundingClientRect(),css=getComputedStyle(image),[ax,ay]=anchors[prefs.art]||[.5,.35],scale=(css.objectFit==='cover'?Math.max:Math.min)(r.width/image.naturalWidth,r.height/image.naturalHeight),dw=image.naturalWidth*scale,dh=image.naturalHeight*scale;
    const leftTop=css.objectPosition==='0% 0%'||css.objectPosition==='left top',anchorX=r.left+(leftTop?0:r.width-dw)+dw*ax,anchorY=r.top+(leftTop?0:(r.height-dh)/2)+dh*ay;
    const w=usageBubble.offsetWidth,h=usageBubble.offsetHeight,left=Math.max(16,Math.min(innerWidth-w-84,anchorX-w-84)),top=Math.max(80,Math.min(innerHeight-h-20,anchorY-80));
    usageBubble.style.left=left+'px';usageBubble.style.top=top+'px';usageBubble.style.setProperty('--tail-y',Math.max(30,Math.min(h-35,anchorY-top-8))+'px');
  }
  function requestUsage(force=false){
    clearTimeout(usageTimer);usageRequest=Date.now().toString(36)+'-'+(++usageSeq);q('usage-line').textContent='等一下，我帮你看看。';q('usage-content').textContent='正在查看你的剩余额度…';q('usage-updated').textContent='';q('usage-refresh').disabled=true;positionUsage();
    const id=usageRequest;usageTimer=setTimeout(()=>receiveUsage(id,{error:'查询超时，请稍后刷新。'}),18000);
    if(typeof window.__yanamiRequestUsage!=='function'){receiveUsage(id,{error:'用量连接暂不可用，请稍后刷新。'});return;}
    try{window.__yanamiRequestUsage(JSON.stringify({id,force}));}catch{receiveUsage(id,{error:'用量连接暂不可用，请稍后刷新。'});}
  }
  function receiveUsage(id,data){
    if(removed||id!==usageRequest||usageBubble.hidden)return;clearTimeout(usageTimer);q('usage-refresh').disabled=false;const content=q('usage-content');content.replaceChildren();
    if(data?.error){q('usage-line').textContent='咦，刚才没看清，再试一次？';content.textContent=data.error;positionUsage();return;}
    const groups=Array.isArray(data?.groups)?data.groups:[];
    const short=groups.flatMap(g=>g.windows||[]).find(w=>w.id==='primary'),remaining=short?.remaining;
    q('usage-line').textContent=!Number.isFinite(remaining)?'这次还没查到额度呢。':remaining===0?'先休息一会儿，等额度恢复吧。':remaining<=20?'额度不多啦，留一点给重要的想法。':'还有余量哦，继续你的故事吧。';
    if(!groups.length)content.textContent='当前账户暂未提供额度数据。';
    for(const group of groups){
      if(groups.length>1){const name=document.createElement('div');name.textContent=group.name;content.append(name);}
      for(const item of group.windows||[]){
        const row=document.createElement('div');row.className='usage-window';const label=document.createElement('div');label.className='usage-label';const caption=document.createElement('span');caption.textContent=item.minutes===10080?'每周额度':item.minutes?((item.minutes%60===0?item.minutes/60+' 小时':item.minutes+' 分钟')+'额度'):(item.id==='primary'?'短周期额度':'长周期额度');
        const value=document.createElement('b'),remaining=Number.isFinite(item.remaining)?Math.max(0,Math.min(100,item.remaining)):null;value.textContent=remaining===null?'未知':Math.round(remaining*10)/10+'%';label.append(caption,value);row.append(label);
        if(remaining!==null){const track=document.createElement('div');track.className='usage-track';track.setAttribute('role','progressbar');track.setAttribute('aria-label',caption.textContent+'剩余');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.setAttribute('aria-valuenow',String(remaining));const fill=document.createElement('div');fill.className='usage-fill';fill.style.width=remaining+'%';track.append(fill);row.append(track);}
        const reset=document.createElement('div');reset.className='usage-reset';reset.textContent=Number.isFinite(item.resetsAt)?(item.resetsAt*1000<=Date.now()?'已到重置时间，可刷新查看':'重置于 '+new Date(item.resetsAt*1000).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})):'重置时间暂不可用';row.append(reset);content.append(row);
      }
    }
    q('usage-updated').textContent=Number.isFinite(data?.updatedAt)?new Date(data.updatedAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})+' 更新':'';positionUsage();
  }
  function toggleUsage(){if(playing||!visible||!ready)return;if(!usageBubble.hidden){closeUsage();return;}usageBubble.hidden=false;character.setAttribute('aria-expanded','true');host.style.zIndex='80';requestUsage();if(!matchMedia('(prefers-reduced-motion:reduce)').matches)usageEntrance=usageBubble.animate([{opacity:0,transform:'translate(8px,5px) scale(.94)'},{opacity:1,transform:'translate(0,0) scale(1.015)',offset:.78},{opacity:1,transform:'translate(0,0) scale(1)'}],{duration:240,easing:'cubic-bezier(.22,.72,.22,1)'});}
  const outsideUsage=e=>{if(!usageBubble.hidden&&!e.composedPath().includes(character)&&!e.composedPath().includes(usageBubble))closeUsage();};
  character.onclick=toggleUsage;character.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleUsage();}};q('usage-close').onclick=()=>closeUsage(true);q('usage-refresh').onclick=()=>requestUsage(true);document.addEventListener('pointerdown',outsideUsage,true);
  let handoffWaitMs=0,handoffTimedOut=false,readinessTimer=null;
  function workbenchReady(){
    // Embedded browser frames and remote images may delay window.load long
    // after React has mounted an enabled editor. Gate on the native editor.
    const composers=[...document.querySelectorAll(composerSelector)];
    return composers.some(c=>{const r=c.getBoundingClientRect();if(r.width<160||r.height<35||c.closest('[inert],[aria-hidden="true"]'))return false;return [...c.querySelectorAll('textarea,input,[contenteditable="true"]')].some(e=>{const b=e.getBoundingClientRect();return b.width>40&&b.height>8&&!e.disabled&&e.getAttribute('aria-disabled')!=='true'&&getComputedStyle(e).visibility!=='hidden';});});
  }
  const status=()=>({version:2,build:'approved-v3',motionEngine:'stable-v5',layoutRuns,installed:!removed,theme:prefs.theme,art:prefs.art,product:productName(),productMode:prefs.product,home,characterVisible:visible&&ready&&!playing,playing,playCount,autoplaySession:desiredStartup,approvedTimelines:true,openingPrepared:!!openingKey,awaitingComposer:!document.querySelector(composerSelector),workbenchReady:workbenchReady(),documentState:document.readyState,handoffWaitMs,handoffTimedOut,readinessDuringOpening:true});
  function syncControls(){shadow.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.theme===prefs.theme));shadow.querySelectorAll('[data-art-choice]').forEach(b=>{b.hidden=assets[b.dataset.artChoice].theme!==prefs.theme;b.setAttribute('aria-pressed',b.dataset.artChoice===prefs.art);});q('show').checked=prefs.show;q('strength').value=prefs.strength;q('breath').checked=prefs.breath;q('product').value=prefs.product;character.dataset.breath=!!prefs.breath;}
  async function selectArt(){
    const id=prefs.art,generation=++artGeneration;ready=false;character.dataset.art=id;
    host.style.setProperty('--accent',prefs.theme==='white'?'#285f9f':'#333');syncControls();
    localStorage.setItem('yanami-native-theme-v1',JSON.stringify(prefs));
    try{const src=await ensureAsset(id);if(removed||generation!==artGeneration)return;image.src=src;await image.decode();if(removed||generation!==artGeneration)return;ready=true;geometryRevision++;schedule();}catch{if(generation===artGeneration){ready=false;schedule();}}
  }
  let lastLayout=null,layoutRuns=0,mutationTimer=0;
  function positionTools(){
    const tools=q('tools');if(!tools)return;const r=tools.getBoundingClientRect();if(!r.width)return;let left=innerWidth-220-r.width;
    const obstacles=[...document.querySelectorAll('button,[role="button"]')].map(e=>e.getBoundingClientRect()).filter(b=>b.width>0&&b.height>0&&b.bottom>r.top&&b.top<r.bottom);
    for(let i=0;i<=obstacles.length;i++){const hits=obstacles.filter(b=>b.left<left+r.width+12&&b.right>left-12);if(!hits.length)break;const next=Math.min(...hits.map(b=>b.left))-r.width-12;if(next<16)break;left=next;}
    const right=Math.round(innerWidth-left-r.width)+'px';if(tools.style.right!==right)tools.style.right=right;
  }
  function layout(force=false){
    frame=0;if(removed||(playing||openingPreparing)&&force!==true)return;if(prefs.product==='auto')productName();
    const composer=[...document.querySelectorAll(composerSelector)].find(e=>{const r=e.getBoundingClientRect();return r.width>160&&r.height>35;});
    // Native navigation retains hidden pages. Scope the greeting to the visible
    // composer's own page rather than the first (possibly cached) main element.
    let main=composer?.closest(mainSelector)||composer?.closest('[role="main"],main');
    if(!main)main=[...document.querySelectorAll(mainSelector)].find(e=>{const r=e.getBoundingClientRect();return r.width>160&&r.height>100;});
    const messages=!!main?.querySelector(messageSelector);
    const signature=()=>{const c=composer?.getBoundingClientRect(),m=main?.getBoundingClientRect();return [innerWidth,innerHeight,c?.x,c?.width,m?.x,m?.width,messages,ready,prefs.show,prefs.strength,prefs.theme,prefs.art,playing].join(':');};
    const inputSignature=signature();
    if(force!==true&&lastLayout?.main===main&&lastLayout?.composer===composer&&lastLayout?.signature===inputSignature){positionTools();if(!usageBubble.hidden)positionUsage();maybeAutoplay();return;}
    layoutRuns++;restoreMarks();
    home=!!(composer&&main&&!messages);visible=false;
    if(composer&&main&&prefs.show){
      const before=main.getBoundingClientRect();
      const available=innerWidth-before.left;
      const narrow=available<920;
      const reserve=narrow?Math.min(320,Math.max(135,available*.30)):Math.min(560,Math.max(390,innerWidth*.35));
      // Keep native content usable at small widths; the decoration disappears instead of covering it.
      visible=available>=480&&composer.getBoundingClientRect().width>=280;
      if(visible){
        if(!originalReserve.has(main))originalReserve.set(main,[main.style.getPropertyValue('--yanami-reserve'),main.style.getPropertyPriority('--yanami-reserve')]);
        mark(main,'data-yanami-space');main.style.setProperty('--yanami-reserve',reserve+'px');nativeVar(main,'--yanami-border',prefs.theme==='white'?'#dce5f1':'#dedede');
        if(home){
          mark(main,'data-yanami-home');const width=Math.min(740,available-reserve-(narrow?40:60)),left=before.left+(narrow?18:32),top=Math.max(240,innerHeight*.45);
          nativeVar(main,'--yanami-left',left+'px');nativeVar(main,'--yanami-width',width+'px');nativeVar(main,'--yanami-top',top+'px');
          mark(composer.closest('[class*="thread-body-max-width"]')||composer.parentElement,'data-yanami-composer');
          mark(main.querySelector('h1,h2'),'data-yanami-heading');homeCopy.style.left=left+'px';homeCopy.style.top=(top-150)+'px';homeCopy.style.width=width+'px';
          q('home-headline').textContent=prefs.theme==='white'?'一起写下，新的一页。':'翻开一页，继续你的故事。';q('home-headline').style.color=prefs.theme==='white'?'#285f9f':'#343434';
          q('home-headline').style.fontSize=narrow?'24px':'30px';
        }
        const r=composer.getBoundingClientRect();
        const left=Math.max(r.right+(narrow?18:28),innerWidth-reserve+12);
        const header=document.querySelector('header:is(.app-header-tint,[data-app-shell-header-edge-scroll],[class*="_Header_"])');
        const top=Math.max(64,Math.min(header?.getBoundingClientRect().bottom||64,100));
        const geometryKey=[left,top,innerWidth,innerHeight,narrow].join(':');if(character.dataset.geometryKey!==geometryKey){character.dataset.geometryKey=geometryKey;geometryRevision++;}
        character.style.cssText=`left:${left}px;right:0;top:${top}px;bottom:0;opacity:${ready?prefs.strength/100:0};`;
        character.dataset.narrow=narrow;
        if(innerWidth-left<(narrow?100:180)){visible=false;restoreMarks();}
      }
    }
    character.style.visibility=visible&&!playing?'visible':'hidden';homeCopy.style.display=home&&visible&&!playing?'block':'none';q('tools').style.display=main?'flex':'none';positionTools();maybeAutoplay();
    if(!visible||playing){if(!usageBubble.hidden)closeUsage();}else positionUsage();
    lastLayout={main,composer,signature:signature()};
  }
  function schedule(){if(!frame&&!removed)frame=requestAnimationFrame(layout);}
  function clearIntro(preserveOpening=false){
    animationToken++;clearTimeout(introTimer);clearTimeout(introSafetyTimer);clearTimeout(readinessTimer);refreshHandoff=null;cancelAnimationFrame(raf);if(preserveOpening!==true){timeline?.kill();timeline=null;openingKey=null;}
    // Reveal the already decoded destination in the same rendering transaction,
    // before removing the bridge. Waiting for layout's next RAF leaves a blank frame.
    playing=false;openingPreparing=false;character.style.visibility=visible&&ready&&prefs.show?'visible':'hidden';
    shadow.querySelector('#bridge')?.remove();activeAnimations.splice(0).forEach(a=>a.cancel());
    q('intro').style.display='none';scene.style.opacity='1';host.style.zIndex='20';delete character.dataset.handoff;schedule();
  }
  function fitOpening(){const k=Math.min(innerWidth/1600,innerHeight/1000);scene.style.transform='scale('+k+')';scene.style.left=(innerWidth-1600*k)/2+'px';scene.style.top=(innerHeight-1000*k)/2+'px';}
  function detectProduct(){
    const shown=e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden';};
    for(const aside of document.querySelectorAll('aside.app-shell-left-panel')){if(!shown(aside))continue;const buttons=[...aside.querySelectorAll('button')].filter(shown);
      for(const b of buttons){const match=(b.getAttribute('aria-label')||'').match(/(?:当前模式|current mode)\s*[:：]\s*(Codex|ChatGPT)\b/i);if(match)return match[1].toLowerCase()==='codex'?'Codex':'ChatGPT';}
      for(const b of buttons){const label=b.textContent.trim();if(label==='Codex'||label==='ChatGPT')return label;}
    }
    return null;
  }
  function productName(){if(prefs.product!=='auto')return prefs.product==='codex'?'Codex':'ChatGPT';const current=detectProduct();if(current){if(localStorage.getItem('yanami-native-last-product')!==current)localStorage.setItem('yanami-native-last-product',current);return current;}return localStorage.getItem('yanami-native-last-product')||'ChatGPT';}
  const animate=(el,frames,options)=>{const a=el.animate(frames,{fill:'both',...options});activeAnimations.push(a);return a;};
  let openingKey=null,introSafetyTimer=null,refreshHandoff=null;
  async function prepareOpening(){
    if(prefs.product==='auto'){const deadline=performance.now()+Math.max(0,1500-(performance.now()-productWaitStarted));while(!removed&&!detectProduct()&&performance.now()<deadline)await new Promise(r=>setTimeout(r,50));}
    const key=[prefs.theme,prefs.art,productName()].join(':');if(openingKey===key&&timeline)return true;
    const token=animationToken;timeline?.kill();timeline=null;if(window.__yanamiLaunchHold){openingPreparing=true;homeCopy.style.display='none';character.style.visibility='hidden';}
    const parsed=new DOMParser().parseFromString(openings[prefs.theme].html,'text/html'),name=productName(),heading=parsed.querySelector('h1');
    if(heading.classList.contains('wordmark'))heading.replaceChildren(...[...name].map(letter=>{const span=document.createElement('span');span.textContent=letter;return span;}));else heading.textContent=name;
    if(name==='ChatGPT')heading.style.fontSize='76px';
    let artSrc;try{artSrc=await ensureAsset(prefs.art);}catch{return false;}if(token!==animationToken||removed)return false;
    const art=parsed.querySelector('.art img,.portrait img');art.src=artSrc;art.style.objectFit='contain';
    const footer=parsed.querySelector('.footer span:last-child');if(footer)footer.textContent=name.toUpperCase()+' / PERSONAL EDITION';
    const identity=parsed.querySelector('.identity');if(identity){identity.replaceChildren();const b=document.createElement('b');b.textContent='八奈见 · 墨';identity.append(b,name.toUpperCase()+' / PERSONAL EDITION');}
    parsed.querySelector('.status').textContent='准备好，继续这一页。';
    openingRoot.replaceChildren(...[...parsed.head.querySelectorAll('style')].map(e=>e.cloneNode(true)),...[...parsed.body.children].map(e=>e.cloneNode(true)));
    const stage=openingRoot.querySelector('#stage');stage.style.width='1600px';stage.style.height='1000px';openingImage=openingRoot.querySelector('.art img,.portrait img');
    await openingImage.decode().catch(()=>{});if(token!==animationToken||removed)return false;
    timeline=timelines[prefs.theme](gsap,selector=>openingRoot.querySelectorAll(selector));timeline.pause(0);fitOpening();
    openingImage.style.willChange='transform';openingImage.style.backfaceVisibility='hidden';for(const el of openingRoot.querySelectorAll('.portrait,.art'))el.style.willChange='transform,opacity';
    if(window.__yanamiLaunchHold){
      // Decode, lay out text and upload the final portrait before the native
      // window is revealed. A timer bounds RAF waits in occluded windows.
      q('intro').style.display='block';host.style.zIndex='2147483000';timeline.pause(prefs.theme==='ink'?3.15:2.75);
      await Promise.race([new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))),new Promise(r=>setTimeout(r,180))]);
      if(token!==animationToken||removed)return false;timeline.pause(0);
    }
    openingKey=key;return true;
  }
  async function play({automatic=false}={}){
    closeUsage();clearIntro(true);const token=animationToken;playing=true;handoffWaitMs=0;handoffTimedOut=false;character.dataset.handoff='true';homeCopy.style.display='none';introSafetyTimer=setTimeout(()=>{if(token!==animationToken)return;if(automatic)localStorage.setItem('yanami-native-last-startup',desiredStartup);clearIntro();},10000);
    let prepared=false;try{prepared=await prepareOpening();}catch{}if(!prepared||token!==animationToken||removed){if(token===animationToken)clearIntro();return;}layout(true);timeline.pause(0);
    q('intro').style.display='block';host.style.zIndex='2147483000';playing=true;playCount++;character.style.visibility='hidden';
    if(automatic)localStorage.setItem('yanami-native-last-startup',desiredStartup);
    const hold=prefs.theme==='ink'?3.15:2.75;
    if(matchMedia('(prefers-reduced-motion:reduce)').matches){timeline.totalTime(hold,false);await new Promise(r=>setTimeout(r,650));if(token===animationToken)clearIntro();return;}
    // The native workbench loads while the opening is playing. Observe its
    // readiness concurrently so the opening does not add another full wait.
    const openingStarted=performance.now(),readinessDeadline=openingStarted+3500;let stableSince=null;
    const readyStable=()=>{const now=performance.now();if(!workbenchReady()){stableSince=null;return false;}if(stableSince===null)stableSince=now;return now-stableSince>=120;};
    const observeReadiness=()=>{if(token!==animationToken||removed)return;readyStable();readinessTimer=setTimeout(observeReadiness,80);};observeReadiness();
    // Native compositor animations keep portraits and lettering moving even
    // while the application's JS thread is occupied loading conversations.
    timeline.pause(hold);
    const run=(selector,frames,duration,delay,easing='cubic-bezier(.22,.61,.36,1)',stagger=0)=>openingRoot.querySelectorAll(selector).forEach((el,i)=>animate(el,frames,{duration:duration*1000,delay:(delay+i*stagger)*1000,easing}));
    const reveal=(selector,y,duration,delay,stagger=0)=>run(selector,[{opacity:0,transform:'translateY('+y+'px)'},{opacity:1,transform:'translateY(0)'}],duration,delay,undefined,stagger);
    if(prefs.theme==='white'){
      run('.edition',[{opacity:0},{opacity:1}],.4,.12);reveal('h1',12,.55,.2);
      run('.art',[{opacity:0,transform:'translateX(15px)'},{opacity:1,transform:'translateX(0)'}],.85,.28);
      reveal('.tagline',7,.45,.55);run('.subtitle,.progress,.status,.footer',[{opacity:0},{opacity:1}],.5,.82);
      run('.progress-fill',[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],1.7,1.12,'cubic-bezier(.65,0,.35,1)');
    }else{
      run('.portrait',[{opacity:0,transform:'translate(100px,85px) scale(1.28)',offset:0,easing:'cubic-bezier(.22,.61,.36,1)'},{opacity:1,transform:'translate(75px,65px) scale(1.22)',offset:.3125,easing:'cubic-bezier(.65,0,.35,1)'},{opacity:1,transform:'translate(0,0) scale(1)',offset:1}],2.4,.05,'linear');
      reveal('.edition',8,.55,1.25);reveal('.wordmark span',24,.65,1.42,.065);reveal('.tagline,.caption',10,.65,1.9,.12);
      run('.rule,.status,.identity',[{opacity:0},{opacity:1}],.45,2.25);run('.ink',[{transform:'scaleX(0)'},{transform:'scaleX(1)'}],1.3,2.35);
    }
    gsap.ticker.sleep();introTimer=setTimeout(async()=>{
      clearTimeout(readinessTimer);const waitStarted=performance.now();
      while(token===animationToken&&!removed&&!readyStable()&&performance.now()<readinessDeadline){
        const statusLabel=openingRoot.querySelector('.status');if(statusLabel)statusLabel.textContent='正在准备聊天区…';
        await new Promise(resolve=>setTimeout(resolve,60));
      }
      handoffWaitMs=Math.round(performance.now()-waitStarted);handoffTimedOut=!workbenchReady();
      if(token===animationToken){const statusLabel=openingRoot.querySelector('.status');if(statusLabel)statusLabel.textContent=handoffTimedOut?'即将进入，请稍候。':'准备好，继续这一页。';layout(true);handoff(token).catch(()=>{if(token===animationToken)clearIntro();});}
    },hold*1000);
  }
  async function handoff(token){
    if(token!==animationToken)return;
    if(!visible||!prefs.show){await animate(q('intro'),[{opacity:1},{opacity:0}],{duration:400}).finished.catch(()=>{});if(token===animationToken)clearIntro();return;}
    const bridge=document.createElement('div');bridge.id='bridge';bridge.style.overflow='hidden';
    const movingImage=document.createElement('img');movingImage.alt='';movingImage.src=image.src;movingImage.style.cssText='position:absolute;left:0;top:0;display:block;max-width:none;object-fit:fill;transform-origin:0 0;will-change:transform;';bridge.style.transformOrigin='0 0';bridge.style.willChange='transform,opacity';bridge.append(movingImage);shadow.append(bridge);
    await Promise.all([movingImage.decode(),image.decode()]).catch(()=>{});if(token!==animationToken){bridge.remove();return;}
    // Animate the painted image, not the element's letterboxed container. A
    // separate clip reproduces both the opening crop and native cover crop.
    function paintedRect(el){
      const r=el.getBoundingClientRect(),css=getComputedStyle(el),scale=(css.objectFit==='cover'?Math.max:Math.min)(r.width/el.naturalWidth,r.height/el.naturalHeight),width=el.naturalWidth*scale,height=el.naturalHeight*scale;
      const parts=css.objectPosition.split(/\s+/),factor=(v,fallback)=>v==='left'||v==='top'?0:v==='right'||v==='bottom'?1:v==='center'?.5:v?.endsWith('%')?parseFloat(v)/100:fallback;
      return {left:r.left+(r.width-width)*factor(parts[0],.5),top:r.top+(r.height-height)*factor(parts[1],.5),width,height};
    }
    function fade(el){const mask=getComputedStyle(el).maskImage;if(!mask||mask==='none')return {start:100,end:1};const stops=[...mask.matchAll(/([\d.]+)%/g)].map(m=>+m[1]);return {start:stops.length>1?stops[stops.length-2]:stops[0]??90,end:0};}
    layout(true);const openingClip=openingImage.closest('.art,.portrait')||openingImage,fromClip=openingClip.getBoundingClientRect(),from=paintedRect(openingImage),fromFade=fade(openingClip),fromOpacity=Number(getComputedStyle(openingClip).opacity)||1;
    Object.assign(bridge.style,{left:'0px',top:'0px',width:fromClip.width+'px',height:fromClip.height+'px'});movingImage.style.width=movingImage.naturalWidth+'px';movingImage.style.height=movingImage.naturalHeight+'px';
    const mix=(a,b,t)=>a+(b-a)*t;
    function frames(){
      const toClip=character.getBoundingClientRect(),to=paintedRect(image),toFade=fade(image),parent=[],child=[];
      for(let i=0;i<=60;i++){
        const t=i/60,eased=1-Math.pow(1-t,3),x=mix(fromClip.left,toClip.left,eased),y=mix(fromClip.top,toClip.top,eased),sx=mix(fromClip.width,toClip.width,eased)/fromClip.width,sy=mix(fromClip.height,toClip.height,eased)/fromClip.height;
        parent.push({offset:t,transform:'translate3d('+x+'px,'+y+'px,0) scale('+sx+','+sy+')',opacity:mix(fromOpacity,prefs.strength/100,eased)});
        child.push({offset:t,transform:'translate3d('+(mix(from.left-fromClip.left,to.left-toClip.left,eased)/sx)+'px,'+(mix(from.top-fromClip.top,to.top-toClip.top,eased)/sy)+'px,0) scale('+(mix(from.width,to.width,eased)/movingImage.naturalWidth/sx)+','+(mix(from.height,to.height,eased)/movingImage.naturalHeight/sy)+')'});
      }
      const mask=f=>'linear-gradient(to bottom,#000 0%,#000 '+f.start+'%,rgba(0,0,0,'+f.end+') 100%)';
      return {parent,child,masks:[{maskImage:mask(fromFade)},{maskImage:mask(toFade)}],needsMask:fromFade.end!==1||toFade.end!==1};
    }
    const motion=frames(),options={duration:780,easing:'linear'},parentMotion=animate(bridge,motion.parent,options),childMotion=animate(movingImage,motion.child,options);
    if(motion.needsMask)animate(bridge,motion.masks,options);
    refreshHandoff=()=>{const updated=frames();parentMotion.effect.setKeyframes(updated.parent);childMotion.effect.setKeyframes(updated.child);};
    openingImage.style.visibility='hidden';openingRoot.querySelectorAll('.copy,.footer,.identity').forEach(el=>animate(el,[{opacity:1},{opacity:0}],{duration:170}));animate(scene,[{opacity:1},{opacity:0}],{duration:480,easing:'ease-out'});animate(q('intro'),[{background:'#fff'},{background:'transparent'}],{duration:540,delay:110});
    await Promise.all([parentMotion.finished,childMotion.finished]).catch(()=>{});if(token===animationToken)clearIntro();
  }
  function maybeAutoplay(){if(window.__yanamiLaunchHold||removed||playing||autoPending||!desiredStartup||document.visibilityState!=='visible'||localStorage.getItem('yanami-native-last-startup')===desiredStartup)return;if(prefs.product==='auto'&&!detectProduct()&&performance.now()-productWaitStarted<1500){clearTimeout(productTimer);productTimer=setTimeout(maybeAutoplay,100);return;}autoPending=true;play({automatic:true}).finally(()=>{autoPending=false;});}
  function startSession(id){if(id&&id!==desiredStartup){desiredStartup=id;productWaitStarted=performance.now();}maybeAutoplay();}
  function remove(){removed=true;clearTimeout(mutationTimer);for(const request of assetRequests.values()){clearTimeout(request.timer);request.reject(Error('removed'));}assetRequests.clear();clearTimeout(productTimer);closeUsage();document.removeEventListener('pointerdown',outsideUsage,true);clearIntro();observer.disconnect();resize.disconnect();restoreMarks();for(const[el,[value,priority]]of originalReserve)value?el.style.setProperty('--yanami-reserve',value,priority):el.style.removeProperty('--yanami-reserve');for(const[el,vars]of originalVariables)for(const[name,[value,priority]]of vars)value?el.style.setProperty(name,value,priority):el.style.removeProperty(name);cancelAnimationFrame(frame);document.removeEventListener('keydown',key);document.removeEventListener('visibilitychange',schedule);window.removeEventListener('resize',resized);host.remove();style.remove();delete window.__yanamiNative;}
  const key=e=>{if(e.key==='Escape'){if(!usageBubble.hidden)closeUsage(true);else clearIntro();}};
function setTheme(theme){prefs.theme=theme;prefs.art=assets[prefs[theme+'Art']]?.theme===theme?prefs[theme+'Art']:theme==='white'?'cutout':'profile';ready=false;selectArt();}
  for(const[id,asset]of Object.entries(assets)){const b=document.createElement('button');b.dataset.artChoice=id;const thumb=document.createElement('img');thumb.loading='lazy';if(asset.src)thumb.src=asset.src;thumb.alt='';const label=document.createElement('span');label.textContent=asset.name;b.append(thumb,label);b.onclick=()=>{prefs.art=id;prefs[prefs.theme+'Art']=id;ready=false;selectArt();};shadow.querySelector('.characters').append(b);}
  q('appearance').onclick=()=>{dialog.showModal();Promise.allSettled(Object.keys(assets).map(ensureAsset));};q('close-panel').onclick=()=>dialog.close();dialog.onclick=e=>{if(e.target===dialog)dialog.close();};
  q('replay').onclick=()=>play();q('preview').onclick=()=>{dialog.close();play();};q('skip').onclick=clearIntro;
  shadow.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>setTheme(b.dataset.theme));
  const persist=()=>localStorage.setItem('yanami-native-theme-v1',JSON.stringify(prefs));
  q('show').onchange=e=>{prefs.show=e.target.checked;persist();schedule();};q('strength').oninput=e=>{prefs.strength=+e.target.value;persist();schedule();};q('breath').onchange=e=>{prefs.breath=e.target.checked;syncControls();persist();};q('product').onchange=e=>{prefs.product=e.target.value;persist();};
  document.addEventListener('visibilitychange',schedule);
  const resized=()=>{if(playing){fitOpening();layout(true);refreshHandoff?.();}else schedule();};
  document.addEventListener('keydown',key);window.addEventListener('resize',resized);
  // Observe structural route/composer changes, never user text or input values.
  // Streamed text may mutate hundreds of nodes per second. Coalesce route
  // checks and skip all layout writes while geometry and page state agree.
  const observer=new MutationObserver(()=>{if(!mutationTimer&&!removed)mutationTimer=setTimeout(()=>{mutationTimer=0;schedule();},160);});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-label','aria-hidden','hidden']});
  const resize=new ResizeObserver(schedule);resize.observe(document.documentElement);
  window.__yanamiNative={version:2,build:'approved-v3',revision:'stable-v5',status,remove,play,prepareOpening,startSession,setTheme,receiveUsage,receiveAsset};selectArt();schedule();maybeAutoplay();

  return status();
}
