export type Player = { id: string; name: string; group: 'A'|'B' };
export type Match = { id: string; a: string; b: string; group: 'A'|'B'|'SF'|'F'; round: number; sets: number[][] };
export type Tournament = { players: Player[]; matches: Match[]; started: boolean; knockout: boolean };
export const emptyTournament = (): Tournament => ({players:[],matches:[],started:false,knockout:false});
export function score(m: Match) { return m.sets.reduce((s,p)=> {s[p[0]>p[1]?0:1]++;return s},[0,0]); }
export function winner(m: Match) {const s=score(m);return s[0]===2?m.a:s[1]===2?m.b:null;}
export function validateSets(sets: unknown): asserts sets is number[][] {
 if(!Array.isArray(sets)||sets.length<2||sets.length>3) throw new Error('Informe 2 ou 3 sets completos.');
 const won=[0,0];
 for(const s of sets){
  if(won.includes(2))throw new Error('A partida termina quando um jogador vence 2 sets.');
  if(!Array.isArray(s)||s.length!==2||s.some(n=>!Number.isSafeInteger(n)||n<0||n>999))throw new Error('Use pontos inteiros entre 0 e 999.');
  const hi=Math.max(...s),lo=Math.min(...s);
  if(hi<11 || hi-lo<2 || (hi>11&&hi-lo!==2))throw new Error('Cada set termina em 11 pontos, com diferença mínima de 2. Após 10 × 10, a diferença deve ser exatamente 2.');
  won[s[0]>s[1]?0:1]++;
 }
 if(!won.includes(2))throw new Error('Um jogador precisa vencer 2 sets.');
}
export function standings(t:Tournament, group:'A'|'B') {
 const rows=t.players.filter(p=>p.group===group).map(p=>({...p,played:0,wins:0,losses:0,sw:0,sl:0,pw:0,pl:0,tied:false}));
 for(const m of t.matches.filter(m=>m.group===group&&winner(m))){const sc=score(m);for(const [i,id] of [m.a,m.b].entries()){const r=rows.find(r=>r.id===id)!;r.played++;r.wins+=sc[i]===2?1:0;r.losses+=sc[i]===2?0:1;r.sw+=sc[i];r.sl+=sc[1-i];for(const s of m.sets){r.pw+=s[i];r.pl+=s[1-i]}}}
 const cmp=(a:typeof rows[number],b:typeof rows[number])=>b.wins-a.wins||(b.sw-b.sl)-(a.sw-a.sl)||(b.pw-b.pl)-(a.pw-a.pl);
 rows.sort((a,b)=>cmp(a,b)||t.players.findIndex(p=>p.id===a.id)-t.players.findIndex(p=>p.id===b.id));
 rows.forEach(r=>r.tied=r.played>0&&rows.some(o=>o.id!==r.id&&cmp(r,o)===0));
 return rows;
}
export function schedule(players:Player[]):Match[]{
 const result:Match[]=[];
 for(const group of ['A','B'] as const){const ids:(string|null)[]=players.filter(p=>p.group===group).map(p=>p.id);if(ids.length%2)ids.push(null);for(let round=1;round<ids.length;round++){for(let i=0;i<ids.length/2;i++){const a=ids[i],b=ids[ids.length-1-i];if(a&&b)result.push({id:crypto.randomUUID(),a,b,group,round,sets:[]})}ids.splice(1,0,ids.pop()!);}}
 return result.sort((a,b)=>a.round-b.round||a.group.localeCompare(b.group));
}
export type Action = {type:string; [key:string]:unknown};
export function applyAction(current:Tournament, action:Action):Tournament {
 const t=structuredClone(current);
 if(action.type==='players'){
  if(t.started)throw new Error('Os jogadores estão definidos. O torneio já começou.');
  if(!Array.isArray(action.names)||action.names.length<4||action.names.length>12)throw new Error('Cadastre de 4 a 12 jogadores.');
  const names=action.names.map(n=>typeof n==='string'?n.trim():'');
  if(names.some(n=>n.length<2||n.length>60)||new Set(names.map(n=>n.toLocaleLowerCase('pt-BR'))).size!==names.length)throw new Error('Use nomes distintos de 2 a 60 caracteres.');
  t.players=names.map((name,i)=>({id:crypto.randomUUID(),name,group:i%2?'B':'A'}));
 }else if(action.type==='start'){
  if(t.started||t.players.length<4)throw new Error('Cadastre os jogadores antes de iniciar.');
  const p=[...t.players];for(let i=p.length-1;i>0;i--){const j=Math.floor(crypto.getRandomValues(new Uint32Array(1))[0]/4294967296*(i+1));[p[i],p[j]]=[p[j],p[i]];}
  t.players=p.map((p,i)=>({...p,group:i%2?'B':'A'}));t.matches=schedule(t.players);t.started=true;
 }else if(action.type==='result'){
  const m=t.matches.find(m=>m.id===action.id);if(!m)throw new Error('Partida não encontrada.');
  if(t.knockout&&(m.group==='A'||m.group==='B'))throw new Error('A fase de grupos foi encerrada.');
  if(m.group==='SF'&&t.matches.some(x=>x.group==='F'&&winner(x)))throw new Error('Remova o resultado da final antes de corrigir a semifinal.');
  if(action.clear===true)m.sets=[];else{validateSets(action.sets);m.sets=action.sets;}
  if(m.group==='SF'){
   const semis=t.matches.filter(m=>m.group==='SF');t.matches=t.matches.filter(m=>m.group!=='F');
   if(semis.length===2&&semis.every(winner))t.matches.push({id:crypto.randomUUID(),a:winner(semis[0])!,b:winner(semis[1])!,group:'F',round:1,sets:[]});
  }
 }else if(action.type==='knockout'){
  if(!t.started||t.knockout||!t.matches.every(winner))throw new Error('Conclua todas as partidas dos grupos primeiro.');
  const [a,b]=(['A','B'] as const).map(g=>standings(t,g));
  t.matches.push({id:crypto.randomUUID(),a:a[0].id,b:b[1].id,group:'SF',round:1,sets:[]},{id:crypto.randomUUID(),a:b[0].id,b:a[1].id,group:'SF',round:1,sets:[]});t.knockout=true;
 }else throw new Error('Ação inválida.');
 return t;
}
