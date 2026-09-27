import { emptyTournament, normalizeTournament, type Tournament } from './tournament';

const STATE_KEY = process.env.TOURNAMENT_STATE_KEY ?? 'arena-solar:tournament';
const VERSION_KEY = `${STATE_KEY}:version`;

type RedisReply<T> = { result?: T; error?: string };

function redisConfig() {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Banco não configurado. Conecte um Redis/Upstash ao projeto no Vercel.');
  }

  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand<T>(command: Array<string | number>): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });

  const payload = (await response.json()) as RedisReply<T>;
  if (!response.ok || payload.error) {
    throw new Error(payload.error ?? 'Falha ao acessar o banco do torneio.');
  }

  return payload.result as T;
}

export async function readTournament() {
  const [raw, rawVersion] = await redisCommand<[string | null, string | null]>([
    'MGET',
    STATE_KEY,
    VERSION_KEY,
  ]);

  const version = Number(rawVersion ?? 0);
  if (!raw) return { tournament: emptyTournament(), version };

  return {
    tournament: normalizeTournament(JSON.parse(raw)),
    version,
  };
}

const CAS_SCRIPT = `
local current = tonumber(redis.call('GET', KEYS[2]) or '0')
local expected = tonumber(ARGV[1])
if current ~= expected then
  return 0
end
redis.call('SET', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], tostring(current + 1))
return 1
`;

export async function writeTournament(next: Tournament, expectedVersion: number) {
  const changed = await redisCommand<number>([
    'EVAL',
    CAS_SCRIPT,
    '2',
    STATE_KEY,
    VERSION_KEY,
    String(expectedVersion),
    JSON.stringify(next),
  ]);

  return changed === 1;
}
