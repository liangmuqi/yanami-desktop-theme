'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {selectBinding,createBinding}=require('../src/client-binding.cjs');
const packageName='OpenAI.Codex_26.1016.8120.0_x64__2p2nqsd0c76g0',location='C:\\Program Files\\WindowsApps\\'+packageName;
const metadata={packageFullName:packageName,packageFamilyName:'OpenAI.Codex_2p2nqsd0c76g0',version:'26.1016.8120.0',installLocation:location,executable:location+'\\app\\ChatGPT.exe',signatureValid:true,signatureKind:'Store',packageStatus:'Ok'};
const old={packageFullName:'OpenAI.Codex_26.1016.6573.0_x64__2p2nqsd0c76g0',executable:'C:\\old\\ChatGPT.exe',appId:metadata.packageFamilyName+'!App',port:49439,allowOneRecovery:false,node:'keep-runtime',activator:'keep-activator'};
(async()=>{
 const selected=selectBinding(old,metadata);assert.equal(selected.packageFullName,packageName);for(const key of ['port','allowOneRecovery','node','activator'])assert.equal(selected[key],old[key]);
 for(const bad of [{signatureValid:false},{packageFamilyName:'unrelated'},{packageStatus:'Updating'},{signatureKind:'Developer'},{executable:'C:\\unrelated.exe'},{installLocation:'C:\\unrelated'},{version:'0.0.0.0'}])assert.throws(()=>selectBinding(old,{...metadata,...bad}));
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'yanami-binding-'));
 try{
  const file=path.join(temporary,'config.json');fs.writeFileSync(file,JSON.stringify(old));let reads=0;
  const binding=createBinding({config:old,configPath:file,resolve:async()=>{reads++;return metadata;}});
  assert.equal((await binding.refresh()).changed,true);assert.deepEqual(JSON.parse(fs.readFileSync(file)),selected);
  assert.equal((await binding.refresh()).changed,false);assert.equal(reads,1);
  assert.equal((await binding.refresh(true)).changed,false);assert.equal(reads,2);
  fs.writeFileSync(file,JSON.stringify(old));const rejecting=createBinding({config:old,configPath:file,resolve:async()=>({...metadata,signatureValid:false})});
  await assert.rejects(rejecting.refresh());await assert.rejects(rejecting.refresh());assert.deepEqual(JSON.parse(fs.readFileSync(file)),old);
 }finally{if(path.dirname(path.resolve(temporary))!==path.resolve(os.tmpdir())||!path.basename(temporary).startsWith('yanami-binding-'))throw Error('Unexpected temporary test directory');fs.rmSync(temporary,{recursive:true,force:true});}
 console.log(JSON.stringify({updateBinding:true,preferencesPreserved:true,unverifiedPackagesRejected:true,cachedRefresh:true,failedValidationLeavesConfigurationUnchanged:true}));
})().catch(error=>{console.error(error);process.exitCode=1;});
