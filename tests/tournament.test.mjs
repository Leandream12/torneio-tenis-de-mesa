import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyTournament,applyAction,validateSets,winner,standings,schedule} from '../lib/tournament.ts';
test('agenda de 4 a 12 jogadores: pares únicos, rodadas sem conflito, grupos equilibrados',()=>{
 for(let n=4;n<=12;n++){
  let t=applyAction(emptyTournament(),{type:'players',names:Array.from({length:n},(_,i)=>'Jogador '+i)});
  t=applyAction(t,{type:'start'});
  const sizes=['A','B'].map(g=>t.players.filter(p=>p.group===g).length);
  assert.ok(Math.abs(sizes[0]-sizes[1])<=1);
  assert.equal(t.matches.length,sizes.reduce((a,n)=>a+n*(n-1)/2,0));
  const pairs=new Set();const occupied=new Set();
  for(const m of t.matches){const pair=[m.a,m.b].sort().join(':');assert.ok(!pairs.has(pair));pairs.add(pair);for(const id of [m.a,m.b]){const k=m.round+id;assert.ok(!occupied.has(k));occupied.add(k)}assert.equal(t.players.find(p=>p.id===m.a).group,t.players.find(p=>p.id===m.b).group)}
 }
});
test('melhor de 3, vantagem e término imediato do set',()=>{
 for(const s of [[[11,0],[11,9]],[[13,11],[8,11],[22,20]],[[10,12],[9,11]]])assert.doesNotThrow(()=>validateSets(s));
 for(const s of [[],[[11,10],[11,9]],[[12,8],[11,4]],[[11,2],[11,3],[11,4]],[[11,2]],[[11,2],[3,11]],[[11,-1],[11,2]],[[11,2.5],[11,3]],[[11,2],[3,11],[8,9]]])assert.throws(()=>validateSets(s));
});
test('torneio completo, classificação e correções de dependências',()=>{
 let t=applyAction(emptyTournament(),{type:'players',names:Array.from({length:12},(_,i)=>'Jogador '+i)});t=applyAction(t,{type:'start'});
 assert.throws(()=>applyAction(t,{type:'knockout'}));assert.throws(()=>applyAction(t,{type:'players',names:['Outro']}));
 for(const m of [...t.matches])t=applyAction(t,{type:'result',id:m.id,sets:[[11,4],[11,8]]});
 for(const g of ['A','B'])assert.equal(standings(t,g).reduce((n,r)=>n+r.played,0),30);
 t=applyAction(t,{type:'knockout'});assert.equal(t.matches.length,32);
 assert.throws(()=>applyAction(t,{type:'result',id:t.matches[0].id,sets:[[11,4],[11,8]]}));
 const semis=t.matches.filter(m=>m.group==='SF');for(const m of semis)t=applyAction(t,{type:'result',id:m.id,sets:[[11,4],[11,8]]});
 let final=t.matches.find(m=>m.group==='F');assert.ok(final);t=applyAction(t,{type:'result',id:final.id,sets:[[11,4],[11,8]]});assert.equal(winner(t.matches.find(m=>m.group==='F')),final.a);
 assert.throws(()=>applyAction(t,{type:'result',id:semis[0].id,clear:true}));
 t=applyAction(t,{type:'result',id:final.id,clear:true});t=applyAction(t,{type:'result',id:semis[0].id,clear:true});assert.ok(!t.matches.find(m=>m.group==='F'));
});
test('cadastro valida limites e duplicados',()=>{for(const names of [['Ana','ana','Beto','Carlos'],['A','B','C','D'],Array(13).fill('Nome')])assert.throws(()=>applyAction(emptyTournament(),{type:'players',names}))});
