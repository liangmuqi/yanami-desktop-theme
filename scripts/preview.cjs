'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),build=require('../src/payload.cjs');
const root=path.resolve(__dirname,'..'),port=Number(process.env.PORT||5177);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid preview port.');
http.createServer((request,response)=>{const url=new URL(request.url,'http://127.0.0.1');response.setHeader('Cache-Control','no-store');response.setHeader('X-Content-Type-Options','nosniff');
 if(url.pathname==='/'){response.setHeader('Content-Type','text/html; charset=utf-8');return response.end(fs.readFileSync(path.join(root,'preview/index.html')));}
 if(url.pathname==='/payload.js'){response.setHeader('Content-Type','text/javascript; charset=utf-8');const art=url.searchParams.get('theme')==='white'?'cutout':'profile';return response.end(build('preview-session',art));}
 if(url.pathname.startsWith('/asset/')){const id=url.pathname.slice(7),asset=build.assets[id];if(asset){response.setHeader('Content-Type','application/json');return response.end(JSON.stringify({src:asset.src}));}}
 response.statusCode=404;response.end('Not found');
}).listen(port,'127.0.0.1',()=>console.log('Local demo only, no real account connection: http://127.0.0.1:'+port));
