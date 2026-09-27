import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const original=readFileSync(new URL('../app/api/tournament/route.ts',import.meta.url),'utf8');
const code=original.replace(/^import .*;$/gm,'');
const fixture=`let testUser=null; export function setUser(v){testUser=v}; async function getChatGPTUser(){return testUser}; function database(){return {}}; async function organizerId(){return 'owner-id'}; function setupHash(){return undefined}; async function readTournament(){return {version:5,tournament:{players:[],matches:[],started:false,knockout:false}}}; function applyAction(){throw new Error('validation reached')};\n`;
const compiled=ts.transpileModule(fixture+code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
const route=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
const request=(origin='https://arena.test',version=5)=>new Request('https://arena.test/api/tournament',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({type:'start',version})});
test('API exige identidade, origem e organizador; rejeita versão desatualizada',async()=>{
 route.setUser(null);assert.equal((await route.POST(request())).status,401);
 route.setUser({userId:'spectator-id',email:'viewer@example.test'});assert.equal((await route.POST(request())).status,403);
 route.setUser({userId:'owner-id',email:'owner@example.test'});assert.equal((await route.POST(request('https://other.test'))).status,403);
 assert.equal((await route.POST(request('https://arena.test',4))).status,409);
 const r=await route.POST(request());assert.equal(r.status,400);assert.equal((await r.json()).error,'validation reached');
});
