'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../src/worker.cjs'),'utf8');
const start=source.indexOf('async function handleLaunchRequest(){'),end=source.indexOf('\nconst binding=',start);
assert(start>0&&end>start);
const calls=[],writes=[];
const ctx={requestPending:true,lastLaunchId:null,requestFile:'request',root:'state',__dirname:'src',process:{pid:7},config:{appId:'official',port:49339},request:{id:'one'},path:require('node:path'),fs:{readFileSync(){return JSON.stringify(ctx.request)},writeFileSync(file,data){writes.push(JSON.parse(data))}},execFile:async(...args)=>{calls.push(args)}};
vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 await ctx.handleLaunchRequest();assert.equal(calls.length,1);assert.equal(writes[0].id,'one');
 ctx.requestPending=true;await ctx.handleLaunchRequest();assert.equal(calls.length,1);
 ctx.request={id:'two'};ctx.requestPending=true;await ctx.handleLaunchRequest();assert.equal(calls.length,2);assert.equal(writes[1].id,'two');
 await ctx.handleLaunchRequest();assert.equal(calls.length,2);
 console.log('PASS: one activation per request, duplicate and idle requests do not reactivate.');
})().catch(e=>{console.error(e);process.exitCode=1});
