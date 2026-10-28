'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require.resolve('../src/worker.cjs'),'utf8');
const begin=source.indexOf('async function connect(target){'),end=source.indexOf('async function apply(target){',begin);
assert(begin>=0&&end>begin);
const sockets=[];let failBinding=false;
class FakeSocket {
 constructor(){this.listeners={};this.closed=false;sockets.push(this);queueMicrotask(()=>this.emit('open',{}));}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 emit(type,event){for(const fn of this.listeners[type]||[])fn(event);}
 send(text){const msg=JSON.parse(text);queueMicrotask(()=>this.emit('message',{data:JSON.stringify({id:msg.id,...(failBinding&&msg.method==='Runtime.addBinding'?{error:{message:'binding failed'}}:{result:{}})})}));}
 close(){this.closed=true;this.emit('close',{});}
}
const context={URL,WebSocket:FakeSocket,config:{port:49339},connections:new Map(),setTimeout,clearTimeout,wake(){},buildPayload:{assets:{}}};
vm.createContext(context);vm.runInContext(source.slice(begin,end),context);
const target={id:'window',webSocketDebuggerUrl:'ws://127.0.0.1:49339/devtools/page/window'};
(async()=>{
 failBinding=true;await assert.rejects(context.connect(target),/binding failed/);assert(sockets[0].closed);assert.equal(context.connections.size,0);
 failBinding=false;const first=await context.connect(target),second=await context.connect(target);
 first.ws.close();assert.equal(context.connections.get(target.id),second);
 second.ws.close();assert.equal(context.connections.size,0);
 console.log('PASS: failed handshake closes the socket; stale close cannot remove a newer connection.');
})().catch(e=>{console.error(e);process.exitCode=1;});
