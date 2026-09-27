import { emptyTournament, normalizeTournament, type Tournament } from './tournament';

type StateRow = {
  data: unknown;
  version: number | string;
};

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    const missing = [
      !url ? 'SUPABASE_URL' : null,
      !secret ? 'SUPABASE_SECRET_KEY' : null,
    ].filter(Boolean).join(' e ');
    throw new Error(`Supabase não configurado: faltando ${missing}.`);
  }

  return { url, secret };
}

function headers(extra: Record<string, string> = {}) {
  const { secret } = supabaseConfig();
  return {
    apikey: secret,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function readTournament() {
  const { url } = supabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/tournament_state?id=eq.1&select=data,version&limit=1`,
    {
      headers: headers(),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao carregar o torneio no Supabase: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as StateRow[];
  const row = rows[0];

  if (!row) {
    return { tournament: emptyTournament(), version: 0 };
  }

  return {
    tournament: normalizeTournament(row.data),
    version: Number(row.version),
  };
}

export async function writeTournament(next: Tournament, expectedVersion: number) {
  const { url } = supabaseConfig();
  const response = await fetch(
    `${url}/rest/v1/tournament_state?id=eq.1&version=eq.${expectedVersion}`,
    {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify({
        data: next,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Falha ao salvar o torneio no Supabase: ${response.status} ${details}`);
  }

  const rows = (await response.json()) as StateRow[];
  return rows.length === 1;
}
