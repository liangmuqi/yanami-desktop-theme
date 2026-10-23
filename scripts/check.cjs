'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),files=[];
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['.git','node_modules','state','bin','build','dist'].includes(e.name))continue;const p=path.join(dir,e.name);e.isDirectory()?walk(p):files.push(p);}}walk(root);
for(const file of files){if(/\.(cjs|js)$/.test(file))new vm.Script(fs.readFileSync(file,'utf8'),{filename:path.relative(root,file)});if(/\.(md|ps1|cjs|js|json|vbs|cmd|yml)$/.test(file)&&!file.includes(path.sep+'vendor'+path.sep)){const text=fs.readFileSync(file,'utf8');assert(!/[A-Z]:[\\/]+Users[\\/]/i.test(text),'Personal absolute path: '+file);assert(!/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-proj-[A-Za-z0-9_-]{20,})/.test(text),'Credential-like content: '+file);}}
const build=require('../src/payload.cjs');assert.equal(Object.keys(build.assets).length,7);for(const theme of ['white','ink'])assert(Object.values(build.assets).some(a=>a.theme===theme));new vm.Script(build('test-session','profile'));
assert(!files.some(f=>/app\.asar|worker-config\.json|probe-result\.json|current-window\.png|profile-path\.txt/.test(path.basename(f))));
console.log(JSON.stringify({filesChecked:files.length,assets:7,payloadSyntax:true,personalPathScan:true,credentialPatternScan:true,nativeClientNotStarted:true}));
