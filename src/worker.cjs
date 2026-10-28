'use strict';
// External appearance adapter. Never writes installed files or creates profiles.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {promisify}=require('node:util');
const execFile=promisify(cp.execFile),root=path.resolve(__dirname,'../state');
fs.mkdirSync(root,{recursive:true});
let config=JSON.parse(fs.readFileSync(path.join(root,'worker-config.json'),'utf8').replace(/^\uFEFF/,''));
const buildPayload=require('./payload.cjs');
const quotaBridge=fs.readFileSync(path.join(__dirname,'quota-bridge.js'),'utf8');
let stopping=false,lastReport='',activePid=null,failures=0;
let clientValidated=false;
let wakeCurrent=null;
function wake(){if(wakeCurrent)wakeCurrent();}
function idle(ms){if(requestPending)return Promise.resolve();return new Promise(resolve=>{const finish=()=>{clearTimeout(timer);wakeCurrent=null;resolve();};const timer=setTimeout(finish,ms);wakeCurrent=finish;});}
const connections=new Map();
const requestFile=path.join(root,'launch-request.json');
let lastLaunchId;try{lastLaunchId=JSON.parse(fs.readFileSync(requestFile,'utf8')).id;}catch{}
let requestPending=false;
const launchWatcher=fs.watch(root,(_,name)=>{if(name==='launch-request.json'){requestPending=true;wake();}});
async function handleLaunchRequest(){
 if(!requestPending)return;requestPending=false;
 let request;try{request=JSON.parse(fs.readFileSync(requestFile,'utf8'));}catch{return;}
 if(!request.id||request.id===lastLaunchId)return;lastLaunchId=request.id;
 await execFile(path.join(__dirname,'../bin/PackageActivator.exe'),[config.appId,'--remote-debugging-address=127.0.0.1 --remote-debugging-port='+config.port,path.join(root,'broker-activation.json')],{windowsHide:true,timeout:15000});
 fs.writeFileSync(path.join(root,'launch-handled.json'),JSON.stringify({id:request.id,at:new Date().toISOString(),workerPid:process.pid}));
}

const binding=require('./client-binding.cjs').createBinding({config,configPath:path.join(root,'worker-config.json'),resolverScript:path.join(__dirname,'../scripts/resolve-client.ps1')});
async function refreshClient(force=false){
 let result;try{result=await binding.refresh(force);clientValidated=true;}catch(error){clientValidated=false;throw error;}if(!result.changed)return;
 for(const connection of connections.values())connection.ws.close();connections.clear();activePid=null;config=result.config;
 fs.writeFileSync(path.join(root,'client-rebind.json'),JSON.stringify({at:new Date().toISOString(),previousPackage:result.previousPackage,packageFullName:config.packageFullName,version:result.version,signatureVerified:true},null,2));
 report({state:'client-version-rebound',version:result.version});
}
function report(value){const text=JSON.stringify(value);if(text===lastReport)return;lastReport=text;fs.writeFileSync(path.join(root,'worker-status.json'),JSON.stringify({at:new Date().toISOString(),workerPid:process.pid,...value},null,2));}
async function ps(code){const encoded=Buffer.from(code,'utf16le').toString('base64');return (await execFile(config.powershell,['-NoProfile','-NonInteractive','-EncodedCommand',encoded],{windowsHide:true,timeout:15000,maxBuffer:1024*1024})).stdout.trim();}
async function inspect(){const r=await execFile(path.join(__dirname,'../bin/ConnectionInfo.exe'),[config.executable,String(config.port)],{windowsHide:true,timeout:5000});return JSON.parse(r.stdout.replace(/^\uFEFF/,''));}
async function roots(){return (await inspect()).roots;}
async function verifyOwner(){const {listeners:list,roots:items}=await inspect();if(items.length!==1||items[0].custom||!items[0].debug||!list.length||list.some(x=>x.pid!==items[0].pid||!['127.0.0.1','::1'].includes(x.address)))throw Error('Debugger owner is not the single original application instance.');return items[0].pid;}
async function connect(target){
 const url=new URL(target.webSocketDebuggerUrl);if(url.hostname!=='127.0.0.1'||+url.port!==config.port)throw Error('Non-local debugger rejected.');
 const ws=new WebSocket(url);await new Promise((ok,no)=>{const t=setTimeout(()=>{ws.close();no(Error('Connection timed out.'));},3000);ws.addEventListener('open',()=>{clearTimeout(t);ok();},{once:true});ws.addEventListener('error',()=>{clearTimeout(t);no(Error('Connection failed.'));},{once:true});});
 let seq=0;const pending=new Map();
 const rpc=(method,params={})=>new Promise((ok,no)=>{const id=++seq,t=setTimeout(()=>{pending.delete(id);no(Error('Renderer response timed out.'));},7000);pending.set(id,{ok,no,t});ws.send(JSON.stringify({id,method,params}));});
 const evaluate=async expression=>{const value=await rpc('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw Error('Theme evaluation failed.');return value.result?.value;};
 ws.addEventListener('message',event=>{let data;try{data=JSON.parse(event.data);}catch{return;}const p=pending.get(data.id);if(p){clearTimeout(p.t);pending.delete(data.id);data.error?p.no(Error(data.error.message)):p.ok(data.result);}if(data.method==='Runtime.bindingCalled'&&data.params?.name==='__yanamiRequestAsset'){const id=data.params.payload,asset=buildPayload.assets[id];if(asset)evaluate('window.__yanamiNative?.receiveAsset('+JSON.stringify(id)+','+JSON.stringify(asset.src)+')').catch(()=>{});}});
 ws.addEventListener('close',()=>{if(connections.get(target.id)?.ws===ws)connections.delete(target.id);for(const p of pending.values()){clearTimeout(p.t);p.no(Error('Window closed.'));}pending.clear();wake();});
 ws.addEventListener('message',event=>{try{const m=JSON.parse(event.data);if(m.method==='Runtime.executionContextsCleared')wake();}catch{}});
 ws.addEventListener('error',()=>{});
 try {
  await rpc('Runtime.enable');await rpc('Runtime.addBinding',{name:'__yanamiRequestAsset'});
  const connection={ws,evaluate};connections.set(target.id,connection);return connection;
 } catch(error) { ws.close(); throw error; }
}
async function apply(target){
 const c=connections.get(target.id)||await connect(target);
 const snapshot=await c.evaluate(`({ready:document.visibilityState==='visible'&&!!document.body&&!!document.head&&innerWidth>650&&innerHeight>400,installed:window.__yanamiNative?.revision==='stable-v10',disabled:localStorage.getItem('yanami-native-disabled')==='1',art:(()=>{try{return JSON.parse(localStorage.getItem('yanami-native-theme-v1')||'{}').art||'profile';}catch{return 'profile';}})()})`);
 if(!snapshot?.ready)return {state:'waiting-for-main-window'};
 if(snapshot.disabled)return {state:'disabled-by-user'};
 if(!snapshot.installed){
  const injectionStarted=performance.now();
  const session=await c.evaluate(`Promise.resolve(window.electronBridge?.getAppSessionId?.()).then(value=>'native:'+(value||${JSON.stringify('process:'+activePid)}))`);
  await c.evaluate(`(()=>{if(!window.__yanamiQuotaBridgeInstalled){window.__yanamiQuotaBridgeInstalled=true;${quotaBridge}}return true;})()`);
  await c.evaluate(buildPayload(session,snapshot.art));
  fs.writeFileSync(path.join(root,'injection-performance.json'),JSON.stringify({at:new Date().toISOString(),art:snapshot.art,assetBytes:Math.round(buildPayload.assets[snapshot.art]?.src.length*3/4)||null,injectionMs:Math.round(performance.now()-injectionStarted)},null,2));
 }
 return c.evaluate(`(()=>{const s=window.__yanamiNative?.status();return {state:'active',skin:s,composerCount:document.querySelectorAll('.composer-surface-chrome,[class*="_ComposerLayoutRoot_"],[data-composer-surface-variant][data-composer-radius-variant]').length,globalInputBlocked:document.body.inert||document.documentElement.inert,hostPointerEvents:getComputedStyle(document.getElementById('yanami-native-theme')).pointerEvents};})()`);
}
// Observe only: connection failure must never close, hide or restart the client.
async function observeUnavailable(){
 const items=await roots();
 if(!items.length){report({state:'idle-client-closed',automaticRestarts:0});return 'closed';}
 if(items.length!==1){report({state:'paused-unexpected-instance-count',rootCount:items.length,automaticRestarts:0});return 'other';}
 const item=items[0];
 report({state:item.debug?'waiting-for-debug-connection':'original-running-without-theme-connection',applicationPid:item.pid,automaticRestarts:0});
 return item.debug?'debug':'normal';
}
function retryDelay(state,failures){return state==='debug'?Math.min(2000,300+failures*150):state==='closed'?1500:5000;}
async function main(){
 const lock=path.join(root,'worker-lock.json');if(fs.existsSync(lock)){try{const old=JSON.parse(fs.readFileSync(lock));const live=await ps(`$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${Number(old.pid)}' -ErrorAction SilentlyContinue;if($p -and $p.Name -eq 'node.exe' -and $p.CommandLine.Contains('${__filename.replaceAll("'","''")}')){'live'}`);if(live==='live'){launchWatcher.close();return;}}catch{}}
 fs.writeFileSync(lock,JSON.stringify({pid:process.pid}));
 try{await refreshClient(true);}catch(error){report({state:'paused-client-validation',error:error.message});}
 try{while(!stopping&&!fs.existsSync(path.join(root,'stop'))){
  try{
   if(!clientValidated)await refreshClient();
   await handleLaunchRequest();
   const response=await fetch('http://127.0.0.1:'+config.port+'/json/list',{signal:AbortSignal.timeout(1500)});if(!response.ok)throw Error('Endpoint unavailable.');const list=await response.json();
   if(activePid===null)activePid=await verifyOwner();
   const targets=list.filter(t=>{try{const u=new URL(t.url);return t.type==='page'&&u.protocol==='app:'&&u.hostname==='-'&&u.pathname==='/index.html'&&!/avatar|quick.chat|detached|mini|popover|notification|spotlight/i.test(u.searchParams.get('initialRoute')||'');}catch{return false;}});
   const status=[];for(const target of targets)status.push(await apply(target));failures=0;report({state:status.some(s=>s.state==='active')?'active':'waiting-for-main-window',applicationPid:activePid,reports:status});
   const settling=!status.length||status.some(s=>s.state==='waiting-for-main-window'||s.skin?.playing);
   await idle(settling?200:4000);
  }catch(error){
   for(const c of connections.values())c.ws.close();connections.clear();activePid=null;failures++;
   let state='other';try{await refreshClient();state=await observeUnavailable();}catch(connectionError){report({state:'paused',error:connectionError.message,automaticRestarts:0});}
   await idle(retryDelay(state,failures));
  }
 }}finally{launchWatcher.close();for(const c of connections.values())c.ws.close();try{if(JSON.parse(fs.readFileSync(lock)).pid===process.pid)fs.rmSync(lock);}catch{}}
}
process.on('SIGTERM',()=>{stopping=true;wake();});main().catch(error=>{report({state:'worker-error',error:error.message});process.exitCode=1;});
