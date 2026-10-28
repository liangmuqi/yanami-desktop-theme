'use strict';
// Exercise the real disconnected-worker path with mocked OS observations.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../src/worker.cjs'),'utf8');
const begin=source.indexOf('async function observeUnavailable(){');
const end=source.indexOf('async function main(){',begin);
assert(begin>=0&&end>begin);
assert(!/probe-original|recover-original|WindowActivator|revealPending|allowOneRecovery/.test(source));
assert(source.includes('spotlight'));
async function run(items,expected){
 const reports=[];
 const context={roots:async()=>items,report:s=>reports.push(s)};
 // No process/activation/filesystem API is available: any attempt must fail.
 vm.createContext(context);
 await vm.runInContext(source.slice(begin,end)+';observeUnavailable()',context);
 assert.equal(reports.length,1);assert.equal(reports[0].state,expected);
 assert.equal(reports[0].automaticRestarts,0);
}
(async()=>{
 await run([],'idle-client-closed');
 await run([{pid:1,debug:false}],'original-running-without-theme-connection');
 await run([{pid:1,debug:true}],'waiting-for-debug-connection');
 await run([{pid:1},{pid:2}],'paused-unexpected-instance-count');
 console.log('PASS: closed, normal launch, unavailable debugger, multiple roots: no client mutation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
