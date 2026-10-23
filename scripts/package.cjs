'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),target=path.join(root,'dist');fs.mkdirSync(target,{recursive:true});
if(process.platform!=='win32')throw Error('Release packaging currently uses Windows tar.exe.');
const names=fs.readdirSync(root).filter(n=>!['.git','node_modules','state','bin','build','dist'].includes(n));
const output=path.join(target,'yanami-desktop-theme-source.zip');const result=cp.spawnSync('tar.exe',['-a','-c','-f',output,...names],{cwd:root,stdio:'inherit',windowsHide:true});if(result.status)process.exit(result.status);console.log(output);
