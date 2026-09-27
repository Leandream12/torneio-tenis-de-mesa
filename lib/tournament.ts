export type Player = { id: string; name: string };
export type Stage = 'QF' | 'SF' | 'F';
export type Match = { id: string; a: string; b: string; stage: Stage; slot: number; sets: number[][] };
export type Tournament = {
  format: 'knockout-8';
  players: Player[];
  matches: Match[];
  started: boolean;
  previousFormat?: unknown;
};
export type Action = { type: string; [key: string]: unknown };
export const emptyTournament = (): Tournament => ({ format: 'knockout-8', players: [], matches: [], started: false });

// Old group-stage records remain archived in the same document; names are not truncated.
export function normalizeTournament(value: unknown): Tournament {
  const old = value as Tournament;
  if (old.format === 'knockout-8') return old;
  return {
    ...emptyTournament(),
    players: (old.players ?? []).map(({ id, name }) => ({ id, name })),
    previousFormat: value,
  };
}
export const setsToWin = (m: Pick<Match, 'stage'>) => m.stage === 'QF' ? 1 : 2;
export const stageName = (stage: Stage) => stage === 'QF' ? 'Quartas de final' : stage === 'SF' ? 'Semifinal' : 'Final';
export const formatName = (stage: Stage) => stage === 'QF' ? 'Set único' : 'Melhor de 3 sets';
export function score(m: Match) {
  return m.sets.reduce((s, p) => { s[p[0] > p[1] ? 0 : 1]++; return s; }, [0, 0]);
}
export function winner(m: Match) {
  const s = score(m), target = setsToWin(m);
  return s[0] === target ? m.a : s[1] === target ? m.b : null;
}
export function validateSets(sets: unknown, stage: Stage): asserts sets is number[][] {
  const target = setsToWin({ stage });
  if (!Array.isArray(sets) || sets.length < target || sets.length > target * 2 - 1)
    throw new Error(target === 1 ? 'As quartas de final são decididas em apenas 1 set.' : 'Informe 2 ou 3 sets completos.');
  const won = [0, 0];
  for (const s of sets) {
    if (won.includes(target)) throw new Error(`A partida termina quando um jogador vence ${target} ${target === 1 ? 'set' : 'sets'}.`);
    if (!Array.isArray(s) || s.length !== 2 || s.some(n => !Number.isSafeInteger(n) || n < 0 || n > 999))
      throw new Error('Use pontos inteiros entre 0 e 999.');
    const hi = Math.max(...s), lo = Math.min(...s);
    if (hi < 11 || hi - lo < 2 || (hi > 11 && hi - lo !== 2))
      throw new Error('Cada set termina em 11 pontos, com diferença mínima de 2. Após 10 × 10, a diferença deve ser exatamente 2.');
    won[s[0] > s[1] ? 0 : 1]++;
  }
  if (!won.includes(target)) throw new Error(`Um jogador precisa vencer ${target} ${target === 1 ? 'set' : 'sets'}.`);
}
function createMatch(stage: Stage, slot: number, a: string, b: string): Match {
  return { id: `${stage}-${slot}`, a, b, stage, slot, sets: [] };
}
export function schedule(players: Player[]): Match[] {
  if (players.length !== 8) throw new Error('São necessários exatamente 8 jogadores.');
  return Array.from({ length: 4 }, (_, i) => createMatch('QF', i + 1, players[i * 2].id, players[i * 2 + 1].id));
}
// Only dependent matches without results may be replaced. Completed results never disappear silently.
function advance(t: Tournament): void {
  const old = t.matches;
  const next = old.filter(m => m.stage === 'QF');
  function resolve(stage: Stage, slot: number, a?: string | null, b?: string | null) {
    const existing = old.find(m => m.stage === stage && m.slot === slot);
    if (existing && existing.a === a && existing.b === b) { next.push(existing); return existing; }
    if (existing?.sets.length) throw new Error(`Remova primeiro o resultado de ${stageName(stage).toLowerCase()} ${slot} para alterar quem avança.`);
    if (a && b) { const m = createMatch(stage, slot, a, b); next.push(m); return m; }
    return undefined;
  }
  const qf = [1, 2, 3, 4].map(slot => next.find(m => m.slot === slot));
  const sf1 = resolve('SF', 1, qf[0] && winner(qf[0]), qf[1] && winner(qf[1]));
  const sf2 = resolve('SF', 2, qf[2] && winner(qf[2]), qf[3] && winner(qf[3]));
  resolve('F', 1, sf1 && winner(sf1), sf2 && winner(sf2));
  t.matches = next;
}
export function standings(t: Tournament) {
  const final = t.matches.find(m => m.stage === 'F');
  const champion = final && winner(final);
  const rows = t.players.map(p => {
    const played = t.matches.filter(m => (m.a === p.id || m.b === p.id) && winner(m));
    const lost = played.find(m => winner(m) !== p.id);
    const rank = champion === p.id ? 1 : lost?.stage === 'F' ? 2 : lost?.stage === 'SF' ? 3 : lost?.stage === 'QF' ? 5 : null;
    let sw = 0, sl = 0;
    for (const m of played) { const s = score(m), i = m.a === p.id ? 0 : 1; sw += s[i]; sl += s[1 - i]; }
    const status = rank === 1 ? 'Campeão' : rank === 2 ? 'Vice-campeão' : lost ? `Eliminado · ${lost.stage === 'SF' ? 'semifinal' : 'quartas'}` : !t.started ? 'Inscrito' : final && (final.a === p.id || final.b === p.id) ? 'Finalista' : t.matches.some(m => m.stage === 'SF' && (m.a === p.id || m.b === p.id)) ? 'Semifinalista' : played.length ? 'Classificado' : 'Nas quartas';
    return { ...p, played: played.length, wins: played.filter(m => winner(m) === p.id).length, losses: lost ? 1 : 0, sw, sl, rank, status };
  });
  return rows.sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0) || b.wins - a.wins);
}
export function applyAction(current: Tournament, action: Action): Tournament {
  const t = structuredClone(current);
  if (action.type === 'players') {
    if (t.started) throw new Error('Os jogadores estão definidos. O torneio já começou.');
    if (!Array.isArray(action.names) || action.names.length < 1 || action.names.length > 8) throw new Error('Cadastre até 8 jogadores. Complete as 8 vagas para iniciar.');
    const names = action.names.map(n => typeof n === 'string' ? n.trim() : '');
    if (names.some(n => n.length < 2 || n.length > 60) || new Set(names.map(n => n.toLocaleLowerCase('pt-BR'))).size !== names.length)
      throw new Error('Use nomes distintos de 2 a 60 caracteres.');
    t.players = names.map(name => ({ id: t.players.find(p => p.name === name)?.id ?? crypto.randomUUID(), name }));
  } else if (action.type === 'start') {
    if (t.started) throw new Error('O torneio já começou.');
    if (t.players.length !== 8) throw new Error('Complete exatamente 8 jogadores antes de iniciar.');
    const p = [...t.players];
    for (let i = p.length - 1; i > 0; i--) {
      const j = Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    t.players = p; t.matches = schedule(p); t.started = true;
  } else if (action.type === 'result') {
    const m = t.matches.find(m => m.id === action.id);
    if (!m) throw new Error('Partida não encontrada ou ainda não definida.');
    if (action.clear === true) m.sets = [];
    else { validateSets(action.sets, m.stage); m.sets = action.sets; }
    advance(t);
  } else throw new Error('Ação inválida.');
  return t;
}
