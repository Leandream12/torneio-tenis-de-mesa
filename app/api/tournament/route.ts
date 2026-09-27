import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database, readTournament, organizerId, setupHash } from '@/lib/storage';
import { applyAction } from '@/lib/tournament';
export const dynamic = 'force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const [state,user,owner]=await Promise.all([readTournament(),getChatGPTUser(),organizerId()]);return reply({...state,isOrganizer:!!user&&owner===user.userId,needsSetup:!owner,signedIn:!!user});}catch{ return reply({error:'Não foi possível carregar o torneio. Tente novamente.'},503);}}
export async function POST(req:Request){
 try{
  if(req.headers.get('origin')!==new URL(req.url).origin)return reply({error:'Origem não autorizada.'},403);
  const user=await getChatGPTUser();if(!user)return reply({error:'Entre na sua conta para continuar.'},401);
  if(!req.headers.get('content-type')?.includes('application/json'))return reply({error:'Formato inválido.'},415);
  const text=await req.text();if(text.length>12000)return reply({error:'Solicitação muito grande.'},413);
  const action=JSON.parse(text);const db=database();
  if(action.type==='claim'){
   const hash=setupHash();if(!hash||typeof action.key!=='string'||action.key.length>100)return reply({error:'Chave de organização inválida.'},403);
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(action.key));
   const actual=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
   if(actual!==hash)return reply({error:'Chave de organização inválida.'},403);
   await db.prepare('INSERT INTO organizer (id,user_id) VALUES (1,?) ON CONFLICT(id) DO NOTHING').bind(user.userId).run();
   if(await organizerId()!==user.userId)return reply({error:'A organização já está vinculada a outra conta.'},403);
   return reply({ok:true});
  }
  if(await organizerId()!==user.userId)return reply({error:'Somente o organizador pode alterar o torneio.'},403);
  const state=await readTournament();if(action.version!==state.version)return reply({error:'O torneio mudou em outra janela. Atualize antes de salvar.'},409);
  const next=applyAction(state.tournament,action);
  const result=await db.prepare('INSERT INTO tournament (id,data,version) VALUES (1,?,1) ON CONFLICT(id) DO UPDATE SET data=excluded.data, version=tournament.version+1 WHERE tournament.version=?').bind(JSON.stringify(next),state.version).run();
  if(!result.meta.changes)return reply({error:'Outra alteração foi salva. Atualize e tente novamente.'},409);
  return reply({ok:true});
 }catch(e){return reply({error:e instanceof Error?e.message:'Não foi possível salvar.'},400);}
}
