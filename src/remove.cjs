'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),config=JSON.parse(fs.readFileSync(path.join(root,'state/worker-config.json'),'utf8').replace(/^\uFEFF/,''));
(async()=>{const info=JSON.parse(cp.execFileSync(path.join(root,'bin/ConnectionInfo.exe'),[config.executable,String(config.port)],{windowsHide:true,encoding:'utf8'}));if(info.roots.length!==1||info.listeners.some(p=>p.pid!==info.roots[0].pid||p.address!=='127.0.0.1'))return;
 const list=await fetch('http://127.0.0.1:'+config.port+'/json/list',{signal:AbortSignal.timeout(2000)}).then(r=>r.json());
 for(const target of list.filter(t=>t.type==='page'&&t.url.startsWith('app://-/index.html'))){const url=new URL(target.webSocketDebuggerUrl);if(url.hostname!=='127.0.0.1'||+url.port!==config.port)continue;await new Promise(resolve=>{const ws=new WebSocket(url),timer=setTimeout(()=>{ws.close();resolve();},2000);ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method:'Runtime.evaluate',params:{expression:'window.__yanamiNative?.remove();true',returnByValue:true}})));ws.addEventListener('message',e=>{if(JSON.parse(e.data).id===1){clearTimeout(timer);ws.close();resolve();}});ws.addEventListener('error',()=>{clearTimeout(timer);resolve();});});}
})().catch(()=>{});
