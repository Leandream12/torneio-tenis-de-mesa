import { env } from 'cloudflare:workers';
import { emptyTournament, type Tournament } from './tournament';
export function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('Banco indisponível.');return db;}
export async function readTournament(){const row=await database().prepare('SELECT data, version FROM tournament WHERE id = 1').first<{data:string;version:number}>();return row?{tournament:JSON.parse(row.data) as Tournament,version:row.version}:{tournament:emptyTournament(),version:0};}
export async function organizerId(){return (await database().prepare('SELECT user_id FROM organizer WHERE id = 1').first<{user_id:string}>())?.user_id;}
export function setupHash(){return (env as unknown as {ORGANIZER_SETUP_HASH?:string}).ORGANIZER_SETUP_HASH;}
