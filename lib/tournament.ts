export type Bracket = 'DAY' | 'NIGHT';
export type Stage = 'ELIM' | 'QF' | 'SF' | 'F';

export type Player = {
  id: string;
  name: string;
  bracket: Bracket;
};

export type Match = {
  id: string;
  a: string;
  b: string;
  stage: Stage;
  slot: number;
  sets: number[][];
  bracket?: Bracket;
};

export type TournamentSnapshotState = {
  format: 'day-night-16';
  players: Player[];
  matches: Match[];
  started: boolean;
};

export type TournamentSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  tournament: TournamentSnapshotState;
};

export type Tournament = TournamentSnapshotState & {
  previousFormat?: unknown;
  history?: TournamentSnapshot[];
};

export type Action = { type: string; [key: string]: unknown };

const HISTORY_LIMIT = 30;

export const emptyTournament = (): Tournament => ({
  format: 'day-night-16',
  players: [],
  matches: [],
  started: false,
  history: [],
});

function snapshotState(t: Tournament): TournamentSnapshotState {
  return {
    format: 'day-night-16',
    players: structuredClone(t.players),
    matches: structuredClone(t.matches),
    started: t.started,
  };
}

function hasMeaningfulState(t: Tournament) {
  return t.started || t.players.length > 0 || t.matches.length > 0;
}

function addHistory(t: Tournament, label: string) {
  if (!hasMeaningfulState(t)) return;
  const snapshot: TournamentSnapshot = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    label,
    tournament: snapshotState(t),
  };
  t.history = [snapshot, ...(t.history ?? [])].slice(0, HISTORY_LIMIT);
}

export function withoutHistory(t: Tournament): Tournament {
  const clean = snapshotState(t);
  return {
    ...clean,
    ...(t.previousFormat === undefined ? {} : { previousFormat: t.previousFormat }),
  };
}

export function normalizeTournament(value: unknown): Tournament {
  const candidate = value as Partial<Tournament> | null;

  if (candidate?.format === 'day-night-16') {
    return {
      format: 'day-night-16',
      players: Array.isArray(candidate.players) ? candidate.players : [],
      matches: Array.isArray(candidate.matches) ? candidate.matches : [],
      started: Boolean(candidate.started),
      history: Array.isArray(candidate.history) ? candidate.history.slice(0, HISTORY_LIMIT) : [],
      ...(candidate.previousFormat === undefined
        ? {}
        : { previousFormat: candidate.previousFormat }),
    };
  }

  return {
    ...emptyTournament(),
    previousFormat: value,
  };
}

export const bracketName = (bracket: Bracket) =>
  bracket === 'DAY' ? 'Chave do Dia' : 'Chave da Noite';

export const bracketShortName = (bracket: Bracket) =>
  bracket === 'DAY' ? 'Dia' : 'Noite';

export const stageName = (stage: Stage) =>
  stage === 'ELIM'
    ? 'Eliminatórias'
    : stage === 'QF'
      ? 'Quartas de final'
      : stage === 'SF'
        ? 'Semifinal'
        : 'Final';

export const stageDay = (stage: Stage) =>
  stage === 'ELIM'
    ? 'Quarta-feira'
    : stage === 'QF' || stage === 'SF'
      ? 'Quinta-feira'
      : 'Sexta-feira';

export const setsToWin = (_m: Pick<Match, 'stage'>) => 2;

export const formatName = (_stage: Stage) => 'Melhor de 3 sets';

export function score(m: Match) {
  return m.sets.reduce(
    (result, set) => {
      result[set[0] > set[1] ? 0 : 1]++;
      return result;
    },
    [0, 0],
  );
}

export function winner(m: Match) {
  const result = score(m);
  const target = setsToWin(m);
  return result[0] === target ? m.a : result[1] === target ? m.b : null;
}

export function validateSets(sets: unknown, stage: Stage): asserts sets is number[][] {
  const target = setsToWin({ stage });

  if (!Array.isArray(sets) || sets.length < target || sets.length > target * 2 - 1) {
    throw new Error('Informe 2 ou 3 sets completos.');
  }

  const won = [0, 0];

  for (const set of sets) {
    if (won.includes(target)) {
      throw new Error(
        `A partida termina quando um jogador vence ${target} sets.`,
      );
    }

    if (
      !Array.isArray(set) ||
      set.length !== 2 ||
      set.some(point => !Number.isSafeInteger(point) || point < 0 || point > 999)
    ) {
      throw new Error('Use pontos inteiros entre 0 e 999.');
    }

    const high = Math.max(...set);
    const low = Math.min(...set);

    if (high < 11 || high - low < 2 || (high > 11 && high - low !== 2)) {
      throw new Error(
        'Cada set termina em 11 pontos, com diferença mínima de 2. Após 10 × 10, a diferença deve ser exatamente 2.',
      );
    }

    won[set[0] > set[1] ? 0 : 1]++;
  }

  if (!won.includes(target)) {
    throw new Error(
      `Um jogador precisa vencer ${target} sets.`,
    );
  }
}

function createMatch(
  stage: Stage,
  slot: number,
  a: string,
  b: string,
  bracket?: Bracket,
): Match {
  return {
    id: bracket ? `${bracket}-${stage}-${slot}` : `${stage}-${slot}`,
    a,
    b,
    stage,
    slot,
    bracket,
    sets: [],
  };
}

function playersForBracket(players: Player[], bracket: Bracket) {
  return players.filter(player => player.bracket === bracket);
}

export function schedule(players: Player[]): Match[] {
  const day = playersForBracket(players, 'DAY');
  const night = playersForBracket(players, 'NIGHT');

  if (day.length !== 8 || night.length !== 8 || players.length !== 16) {
    throw new Error('São necessários exatamente 8 jogadores no Dia e 8 na Noite.');
  }

  const build = (bracket: Bracket, bracketPlayers: Player[]) =>
    Array.from({ length: 4 }, (_, index) =>
      createMatch(
        'ELIM',
        index + 1,
        bracketPlayers[index * 2].id,
        bracketPlayers[index * 2 + 1].id,
        bracket,
      ),
    );

  return [...build('DAY', day), ...build('NIGHT', night)];
}

function advance(t: Tournament): void {
  const old = t.matches;
  const next = old.filter(match => match.stage === 'ELIM');

  function resolve(
    stage: Stage,
    slot: number,
    a?: string | null,
    b?: string | null,
    bracket?: Bracket,
  ) {
    const existing = old.find(
      match =>
        match.stage === stage &&
        match.slot === slot &&
        match.bracket === bracket,
    );

    if (existing && existing.a === a && existing.b === b) {
      next.push(existing);
      return existing;
    }

    if (existing?.sets.length) {
      const label = bracket
        ? `${stageName(stage).toLowerCase()} da ${bracketName(bracket).toLowerCase()}`
        : stageName(stage).toLowerCase();
      throw new Error(
        `Remova primeiro o resultado da ${label} para alterar quem avança.`,
      );
    }

    if (a && b) {
      const match = createMatch(stage, slot, a, b, bracket);
      next.push(match);
      return match;
    }

    return undefined;
  }

  let dayFinalist: string | null | undefined;
  let nightFinalist: string | null | undefined;

  for (const bracket of ['DAY', 'NIGHT'] as Bracket[]) {
    const eliminations = [1, 2, 3, 4].map(slot =>
      next.find(
        match =>
          match.stage === 'ELIM' &&
          match.bracket === bracket &&
          match.slot === slot,
      ),
    );

    const qf1 = resolve(
      'QF',
      1,
      eliminations[0] && winner(eliminations[0]),
      eliminations[1] && winner(eliminations[1]),
      bracket,
    );

    const qf2 = resolve(
      'QF',
      2,
      eliminations[2] && winner(eliminations[2]),
      eliminations[3] && winner(eliminations[3]),
      bracket,
    );

    const semifinal = resolve(
      'SF',
      1,
      qf1 && winner(qf1),
      qf2 && winner(qf2),
      bracket,
    );

    const finalist = semifinal && winner(semifinal);
    if (bracket === 'DAY') dayFinalist = finalist;
    else nightFinalist = finalist;
  }

  resolve('F', 1, dayFinalist, nightFinalist);
  t.matches = next;
}

export function standings(t: Tournament) {
  const final = t.matches.find(match => match.stage === 'F');
  const champion = final && winner(final);

  const rows = t.players.map(player => {
    const played = t.matches.filter(
      match =>
        (match.a === player.id || match.b === player.id) &&
        winner(match),
    );

    const lost = played.find(match => winner(match) !== player.id);

    const rank =
      champion === player.id
        ? 1
        : lost?.stage === 'F'
          ? 2
          : lost?.stage === 'SF'
            ? 3
            : lost?.stage === 'QF'
              ? 5
              : lost?.stage === 'ELIM'
                ? 9
                : null;

    let sw = 0;
    let sl = 0;

    for (const match of played) {
      const result = score(match);
      const index = match.a === player.id ? 0 : 1;
      sw += result[index];
      sl += result[1 - index];
    }

    const bracket = bracketShortName(player.bracket);
    const isFinalist = final && (final.a === player.id || final.b === player.id);
    const isSemifinalist = t.matches.some(
      match =>
        match.stage === 'SF' &&
        match.bracket === player.bracket &&
        (match.a === player.id || match.b === player.id),
    );
    const isQuarterfinalist = t.matches.some(
      match =>
        match.stage === 'QF' &&
        match.bracket === player.bracket &&
        (match.a === player.id || match.b === player.id),
    );

    const status =
      rank === 1
        ? 'Campeão'
        : rank === 2
          ? 'Vice-campeão'
          : lost
            ? `Eliminado · ${lost.stage === 'SF' ? 'semifinal' : lost.stage === 'QF' ? 'quartas' : 'eliminatórias'}`
            : !t.started
              ? `Inscrito · ${bracket}`
              : isFinalist
                ? `Finalista · ${bracket}`
                : isSemifinalist
                  ? `Semifinalista · ${bracket}`
                  : isQuarterfinalist
                    ? `Quartas · ${bracket}`
                    : `Eliminatórias · ${bracket}`;

    return {
      ...player,
      played: played.length,
      wins: played.filter(match => winner(match) === player.id).length,
      losses: lost ? 1 : 0,
      sw,
      sl,
      rank,
      status,
    };
  });

  return rows.sort(
    (a, b) =>
      (a.rank ?? 99) - (b.rank ?? 99) ||
      b.wins - a.wins ||
      a.bracket.localeCompare(b.bracket) ||
      a.name.localeCompare(b.name, 'pt-BR'),
  );
}

function validateNames(value: unknown, label: string) {
  if (!Array.isArray(value) || value.length > 8) {
    throw new Error(`Cadastre até 8 jogadores na ${label}.`);
  }

  return value.map(name => (typeof name === 'string' ? name.trim() : ''));
}

export function applyAction(current: Tournament, action: Action): Tournament {
  const t = structuredClone(current);
  t.history = Array.isArray(t.history) ? t.history : [];

  if (action.type === 'players') {
    if (t.started) {
      throw new Error('Os jogadores estão definidos. O torneio já começou.');
    }

    const dayNames = validateNames(action.dayNames, 'Chave do Dia');
    const nightNames = validateNames(action.nightNames, 'Chave da Noite');
    const allNames = [...dayNames, ...nightNames];

    if (allNames.length < 1) {
      throw new Error('Cadastre pelo menos um jogador.');
    }

    if (
      allNames.some(name => name.length < 2 || name.length > 60) ||
      new Set(allNames.map(name => name.toLocaleLowerCase('pt-BR'))).size !==
        allNames.length
    ) {
      throw new Error('Use nomes distintos de 2 a 60 caracteres.');
    }

    addHistory(t, 'Antes de atualizar os jogadores');

    const makePlayers = (names: string[], bracket: Bracket) =>
      names.map(name => ({
        id:
          t.players.find(
            player => player.name === name && player.bracket === bracket,
          )?.id ?? crypto.randomUUID(),
        name,
        bracket,
      }));

    t.players = [
      ...makePlayers(dayNames, 'DAY'),
      ...makePlayers(nightNames, 'NIGHT'),
    ];
  } else if (action.type === 'replacePlayer') {
    if (typeof action.playerId !== 'string' || typeof action.name !== 'string') {
      throw new Error('Substituição inválida.');
    }

    const player = t.players.find(item => item.id === action.playerId);
    if (!player) throw new Error('Jogador não encontrado.');

    const nextName = action.name.trim();

    if (nextName.length < 2 || nextName.length > 60) {
      throw new Error('Use um nome entre 2 e 60 caracteres.');
    }

    const duplicate = t.players.some(
      item =>
        item.id !== player.id &&
        item.name.toLocaleLowerCase('pt-BR') ===
          nextName.toLocaleLowerCase('pt-BR'),
    );

    if (duplicate) {
      throw new Error('Já existe um jogador com esse nome no torneio.');
    }

    const hasRecordedResult = t.matches.some(
      match =>
        (match.a === player.id || match.b === player.id) &&
        match.sets.length > 0,
    );

    if (hasRecordedResult) {
      throw new Error(
        'Este jogador já possui resultado registrado. Remova os resultados dele antes de fazer a substituição.',
      );
    }

    addHistory(t, `Antes de substituir ${player.name} por ${nextName}`);
    player.name = nextName;
  } else if (action.type === 'start') {
    if (t.started) throw new Error('O torneio já começou.');

    const day = playersForBracket(t.players, 'DAY');
    const night = playersForBracket(t.players, 'NIGHT');

    if (day.length !== 8 || night.length !== 8 || t.players.length !== 16) {
      throw new Error(
        'Complete exatamente 8 jogadores na Chave do Dia e 8 na Chave da Noite.',
      );
    }

    addHistory(t, 'Antes de sortear e iniciar o torneio');

    const shuffle = (players: Player[]) => {
      const result = [...players];
      for (let index = result.length - 1; index > 0; index--) {
        const random =
          crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
        const target = Math.floor(random * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
      }
      return result;
    };

    const shuffledDay = shuffle(day);
    const shuffledNight = shuffle(night);

    t.players = [...shuffledDay, ...shuffledNight];
    t.matches = schedule(t.players);
    t.started = true;
  } else if (action.type === 'reset') {
    addHistory(t, 'Backup antes de resetar o torneio');

    return {
      ...emptyTournament(),
      history: t.history ?? [],
      ...(t.previousFormat === undefined
        ? {}
        : { previousFormat: t.previousFormat }),
    };
  } else if (action.type === 'restore') {
    if (typeof action.snapshotId !== 'string') {
      throw new Error('Backup inválido.');
    }

    const snapshot = t.history.find(item => item.id === action.snapshotId);
    if (!snapshot) throw new Error('Backup não encontrado.');

    addHistory(t, 'Backup antes de restaurar uma versão anterior');

    const restored = structuredClone(snapshot.tournament);
    t.format = restored.format;
    t.players = restored.players;
    t.matches = restored.matches;
    t.started = restored.started;
  } else if (action.type === 'result') {
    const match = t.matches.find(item => item.id === action.id);
    if (!match) throw new Error('Partida não encontrada ou ainda não definida.');

    const matchLabel =
      match.stage === 'F'
        ? 'Grande Final'
        : `${stageName(match.stage)} · ${match.bracket ? bracketName(match.bracket) : ''}`;

    addHistory(
      t,
      action.clear === true
        ? `Antes de remover o resultado de ${matchLabel}`
        : `Antes de alterar o resultado de ${matchLabel}`,
    );

    if (action.clear === true) {
      match.sets = [];
    } else {
      validateSets(action.sets, match.stage);
      match.sets = action.sets;
    }

    advance(t);
  } else {
    throw new Error('Ação inválida.');
  }

  return t;
}
