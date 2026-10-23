'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),{promisify}=require('node:util');
const execFile=promisify(cp.execFile),family='OpenAI.Codex_2p2nqsd0c76g0';
function selectBinding(config,metadata){
 if(config.appId!==family+'!App'||metadata.packageFamilyName!==family||metadata.signatureValid!==true||metadata.signatureKind!=='Store'||metadata.packageStatus!=='Ok')throw Error('Official desktop package validation failed.');
 const match=/^OpenAI\.Codex_(\d+\.\d+\.\d+\.\d+)_(?:x64|arm64|x86)__2p2nqsd0c76g0$/.exec(metadata.packageFullName||'');
 if(!match||match[1]!==metadata.version||typeof metadata.installLocation!=='string'||!path.win32.isAbsolute(metadata.installLocation)||path.win32.basename(metadata.installLocation)!==metadata.packageFullName)throw Error('Unexpected desktop package identity.');
 const expected=path.win32.join(metadata.installLocation,'app','ChatGPT.exe');
 if(typeof metadata.executable!=='string'||path.win32.normalize(metadata.executable).toLowerCase()!==expected.toLowerCase())throw Error('Desktop executable does not match its registered package.');
 return {...config,packageFullName:metadata.packageFullName,executable:expected,appId:family+'!App'};
}
function createBinding({config,configPath,resolverScript,resolve,intervalMs=30000}){
 let current=config,lastCheck=-Infinity,lastError=null;
 const read=resolve||(async()=>{
  const result=await execFile(current.powershell,['-NoProfile','-NonInteractive','-File',resolverScript],{windowsHide:true,timeout:15000,maxBuffer:1024*1024});
  return JSON.parse(result.stdout.replace(/^\uFEFF/,''));
 });
 return {async refresh(force=false){
  if(!force&&Date.now()-lastCheck<intervalMs){if(lastError)throw lastError;return {config:current,changed:false};}
  lastCheck=Date.now();
  try{
   const metadata=await read(),next=selectBinding(current,metadata),changed=next.packageFullName!==current.packageFullName||next.executable!==current.executable;
   const previousPackage=current.packageFullName;
   if(changed){const temporary=configPath+'.next';fs.writeFileSync(temporary,JSON.stringify(next,null,2));fs.renameSync(temporary,configPath);current=next;}
   lastError=null;return {config:current,changed,previousPackage,version:metadata.version};
  }catch(error){lastError=error;throw error;}
 }};
}
module.exports={selectBinding,createBinding};
