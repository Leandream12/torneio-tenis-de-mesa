import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyTournament,normalizeTournament,applyAction,validateSets,winner,standings,schedule} from '../lib/tournament.ts';
const names=Array.from({length:8},(_,i)=>'Jogador '+i);
const begin=()=>applyAction(applyAction(emptyTournament(),{type:'players',names}),{type:'start'});
const result=(t,id,sets)=>applyAction(t,{type:'result',id,sets});
test('exatamente 8 jogadores, quatro quartas e cada jogador aparece uma vez',()=>{
 const t=begin();assert.equal(t.matches.length,4);assert.ok(t.matches.every(m=>m.stage==='QF'));
 assert.equal(new Set(t.matches.flatMap(m=>[m.a,m.b])).size,8);
 for(const n of [1,4,7])assert.throws(()=>applyAction(applyAction(emptyTournament(),{type:'players',names:names.slice(0,n)}),{type:'start'}));
 assert.throws(()=>applyAction(emptyTournament(),{type:'players',names:[...names,'Nono']}));
 assert.throws(()=>applyAction(t,{type:'start'}));assert.throws(()=>applyAction(t,{type:'players',names}));
});
test('quartas exigem um set e decisões exigem dois sets vencidos',()=>{
 for(const s of [[[11,0]],[[11,9]],[[13,11]],[[20,22]]])assert.doesNotThrow(()=>validateSets(s,'QF'));
 assert.throws(()=>validateSets([[11,4],[11,8]],'QF'));
 for(const stage of ['SF','F']){
  assert.throws(()=>validateSets([[11,4]],stage));
  for(const s of [[[11,0],[11,9]],[[13,11],[8,11],[22,20]],[[10,12],[9,11]]])assert.doesNotThrow(()=>validateSets(s,stage));
  for(const s of [[],[[11,10],[11,9]],[[12,8],[11,4]],[[11,2],[11,3],[11,4]],[[11,2],[3,11]],[[11,-1],[11,2]],[[11,2.5],[11,3]],[[11,2],[3,11],[8,9]]])assert.throws(()=>validateSets(s,stage));
 }
});
test('sete partidas até o campeão, final única MD3 e posições compartilhadas',()=>{
 let t=begin();t=result(t,'QF-1',[[11,5]]);assert.equal(t.matches.length,4);
 t=result(t,'QF-2',[[5,11]]);let sf1=t.matches.find(m=>m.id==='SF-1');assert.ok(sf1);
 assert.equal(sf1.a,winner(t.matches.find(m=>m.id==='QF-1')));assert.equal(sf1.b,winner(t.matches.find(m=>m.id==='QF-2')));
 t=result(t,'QF-3',[[11,8]]);t=result(t,'QF-4',[[12,14]]);assert.equal(t.matches.length,6);
 t=result(t,'SF-1',[[11,4],[9,11],[11,6]]);assert.ok(!t.matches.some(m=>m.stage==='F'));
 t=result(t,'SF-2',[[4,11],[9,11]]);assert.equal(t.matches.length,7);
 const f=t.matches.find(m=>m.stage==='F');assert.equal(t.matches.filter(m=>m.stage==='F').length,1);
 assert.throws(()=>result(t,f.id,[[11,3]]));
 t=result(t,f.id,[[11,3],[11,9]]);assert.equal(winner(t.matches.find(m=>m.stage==='F')),f.a);assert.equal(t.matches.length,7);
 const ranks=standings(t);assert.equal(ranks.filter(p=>p.rank===1).length,1);assert.equal(ranks.filter(p=>p.rank===2).length,1);assert.equal(ranks.filter(p=>p.rank===3).length,2);assert.equal(ranks.filter(p=>p.rank===5).length,4);
});
test('correções preservam resultados dependentes e impedem troca de adversários já pontuados',()=>{
 let t=begin();for(const q of [...t.matches])t=result(t,q.id,[[11,4]]);
 t=result(t,'SF-1',[[11,4],[11,8]]);t=result(t,'SF-2',[[11,4],[11,8]]);t=result(t,'F-1',[[11,4],[11,8]]);
 const snapshot=JSON.stringify(t);assert.throws(()=>result(t,'QF-1',[[4,11]]));assert.equal(JSON.stringify(t),snapshot);
 t=result(t,'QF-1',[[11,7]]);assert.ok(winner(t.matches.find(m=>m.id==='F-1')));
 assert.throws(()=>applyAction(t,{type:'result',id:'SF-1',clear:true}));
 t=applyAction(t,{type:'result',id:'F-1',clear:true});t=applyAction(t,{type:'result',id:'SF-1',clear:true});assert.ok(!t.matches.some(m=>m.stage==='F'));
 t=result(t,'QF-1',[[4,11]]);assert.equal(t.matches.find(m=>m.id==='SF-1').a,winner(t.matches.find(m=>m.id==='QF-1')));
});
test('conversão mantém todos os nomes e arquiva o estado anterior sem apagar resultados',()=>{
 const old={players:Array.from({length:12},(_,i)=>({id:String(i),name:'Jogador '+i,group:'A'})),matches:[{id:'old',sets:[[11,4],[11,3]]}],started:true,knockout:false};
 const t=normalizeTournament(old);assert.equal(t.players.length,12);assert.deepEqual(t.previousFormat,old);assert.equal(t.matches.length,0);assert.equal(t.started,false);
 assert.throws(()=>applyAction(t,{type:'start'}));
 const updated=applyAction(t,{type:'players',names});assert.equal(updated.players.length,8);assert.deepEqual(updated.previousFormat,old);assert.equal(updated.players[0].id,'0');
 assert.deepEqual(normalizeTournament(updated),updated);
});
test('nomes duplicados, vazios e placares de confronto inexistente são rejeitados',()=>{
 for(const values of [[],['Ana','ana'],['A'],[null]])assert.throws(()=>applyAction(emptyTournament(),{type:'players',names:values}));
 assert.throws(()=>result(begin(),'F-1',[[11,4],[11,3]]));
});
