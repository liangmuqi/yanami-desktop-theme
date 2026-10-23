'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=path.resolve(__dirname,'..'),assetRoot=path.join(base,'assets');
const manifest=JSON.parse(fs.readFileSync(path.join(assetRoot,'manifest.json'),'utf8')),assets={};
for(const[id,asset]of Object.entries(manifest.assets)){
 if(!/^[a-z0-9-]+\.(webp|png)$/i.test(asset.file)||!['white','ink'].includes(asset.theme))throw Error('Invalid local asset manifest.');
 const bytes=fs.readFileSync(path.join(assetRoot,asset.file));if(bytes.length>10*1024*1024)throw Error('Image exceeds 10 MiB.');
 assets[id]={name:asset.name,theme:asset.theme,src:'data:image/'+(asset.file.endsWith('.webp')?'webp':'png')+';base64,'+bytes.toString('base64')};
}
const openings=JSON.parse(fs.readFileSync(path.join(__dirname,'openings.json'),'utf8'));
const motion=fs.readFileSync(path.join(base,'vendor/gsap.min.js'),'utf8'),skin=fs.readFileSync(path.join(__dirname,'skin.js'),'utf8');
const timelines=Object.entries(openings).map(([theme,value])=>JSON.stringify(theme)+':function(gsap,select){'+value.timeline+'\nreturn tl;}').join(',');
function build(startupId,initialArt='profile'){
 const selected=assets[initialArt]?initialArt:'profile';
 const initial=Object.fromEntries(Object.entries(assets).map(([id,asset])=>[id,{...asset,src:id===selected?asset.src:null}]));
 return `(()=>{const gsap=(function(){var exports={},module={exports};\n${motion}\nreturn exports.gsap;})();return (${skin})(${JSON.stringify(initial)},${JSON.stringify(openings)},gsap,{${timelines}},${JSON.stringify(startupId)});})()`;
}
build.assets=assets;module.exports=build;
