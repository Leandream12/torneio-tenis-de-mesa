import { emptyTournament, normalizeTournament, type Tournament } from './tournament';

type StateRow = {
  data: unknown;
  version: number | string;
};

type CompatibilityEnvelope = {
  dayNightTournament?: unknown;
  [key: string]: unknown;
};

function supabaseConfig() {
  const rawUrl =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const url = rawUrl?.replace(/\/$/, '');
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();

  if (!url || !secret) {
    const missing = [
      !url ? 'SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL' : null,
      !secret ? 'SUPABASE_SECRET_KEY' : null,
    ]
      .filter(Boolean)
      .join(' e ');
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

async function fetchRow(expectedVersion?: number) {
  const { url } = supabaseConfig();
  const versionFilter =
    expectedVersion === undefined ? '' : `&version=eq.${expectedVersion}`;

  const response = await fetch(
    `${url}/rest/v1/tournament_state?id=eq.1${versionFilter}&select=data,version&limit=1`,
    {
      headers: headers(),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Falha ao carregar o torneio no Supabase: ${response.status} ${details}`,
    );
  }

  const rows = (await response.json()) as StateRow[];
  return rows[0];
}

function nestedTournament(data: unknown) {
  if (
    data &&
    typeof data === 'object' &&
    'dayNightTournament' in data
  ) {
    return (data as CompatibilityEnvelope).dayNightTournament;
  }

  return data;
}

function preserveLegacyState(raw: unknown, next: Tournament) {
  if (raw && typeof raw === 'object') {
    return {
      ...(raw as Record<string, unknown>),
      dayNightTournament: next,
    };
  }

  return {
    format: 'knockout-8',
    players: [],
    matches: [],
    started: false,
    dayNightTournament: next,
  };
}

export async function readTournament() {
  const row = await fetchRow();

  if (!row) {
    return { tournament: emptyTournament(), version: 0 };
  }

  return {
    tournament: normalizeTournament(nestedTournament(row.data)),
    version: Number(row.version),
  };
}

export async function writeTournament(
  next: Tournament,
  expectedVersion: number,
) {
  const { url } = supabaseConfig();
  const current = await fetchRow(expectedVersion);

  if (!current) {
    return false;
  }

  const data = preserveLegacyState(current.data, next);

  const response = await fetch(
    `${url}/rest/v1/tournament_state?id=eq.1&version=eq.${expectedVersion}`,
    {
      method: 'PATCH',
      headers: headers({ Prefer: 'return=representation' }),
      body: JSON.stringify({
        data,
        version: expectedVersion + 1,
        updated_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Falha ao salvar o torneio no Supabase: ${response.status} ${details}`,
    );
  }

  const rows = (await response.json()) as StateRow[];
  return rows.length === 1;
}
