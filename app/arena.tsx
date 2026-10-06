'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  ArchiveRestore,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  History,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MonitorUp,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Shuffle,
  Sun,
  Moon,
  Table2,
  Trophy,
  Users,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Toaster, toast } from 'sonner';
import ConfettiBurst from '@/components/confetti-burst';
import {
  bracketName,
  bracketShortName,
  formatName,
  score,
  stageDay,
  stageName,
  standings,
  validateSets,
  winner,
  type Action,
  type Bracket,
  type Match,
  type Stage,
  type Tournament,
  type TournamentSnapshot,
} from '@/lib/tournament';

type Data = {
  tournament: Tournament;
  version: number;
  isOrganizer: boolean;
  needsSetup: boolean;
  organizerConfigured: boolean;
};

const TOTAL_MATCHES = 15;

function Avatar({ name, index = 0 }: { name: string; index?: number }) {
  return (
    <span className={'avatar av' + (index % 4)}>
      {name
        .split(' ')
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase()}
    </span>
  );
}

function historyDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function splitNames(value: string) {
  return value
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean);
}

export default function Arena() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('overview');
  const [modal, setModal] = useState<
    'players' | 'setup' | 'start' | 'reset' | 'organizer' | 'history' | 'restore' | null
  >(null);
  const [dayNames, setDayNames] = useState('');
  const [nightNames, setNightNames] = useState('');
  const [key, setKey] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<TournamentSnapshot | null>(null);
  const [editing, setEditing] = useState<Match | null>(null);
  const [sets, setSets] = useState<string[][]>([
    ['', ''],
    ['', ''],
    ['', ''],
  ]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/tournament', { cache: 'no-store' });
      const next = (await response.json()) as Data & { error?: string };
      if (!response.ok) throw new Error(next.error);
      setData(next);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha de conexão.');
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 20000);
    return () => window.clearInterval(id);
  }, [load]);

  async function mutate(action: Action, success = 'Alterações salvas.') {
    setBusy(true);
    try {
      const response = await fetch('/api/tournament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...action, version: data?.version }),
      });
      const next = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(next.error);
      await load();
      toast.success(success);
      return true;
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Não foi possível salvar.',
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const tournament = data?.tournament;
  const done = tournament?.matches.filter(winner).length ?? 0;
  const final = tournament?.matches.find(match => match.stage === 'F');
  const champion = final && winner(final);
  const celebrationToken =
    champion && final
      ? `${champion}:${final.sets.map(set => set.join('-')).join('/')}`
      : null;

  const playerName = (id: string) =>
    tournament?.players.find(player => player.id === id)?.name ?? 'A definir';

  const dayCount =
    tournament?.players.filter(player => player.bracket === 'DAY').length ?? 0;
  const nightCount =
    tournament?.players.filter(player => player.bracket === 'NIGHT').length ?? 0;

  const phase = champion
    ? 'Torneio encerrado'
    : final
      ? 'Grande final'
      : tournament?.matches.some(match => match.stage === 'SF')
        ? 'Semifinais'
        : tournament?.matches.some(match => match.stage === 'QF')
          ? 'Quartas de final'
          : tournament?.started
            ? 'Eliminatórias'
            : 'Inscrições abertas';

  function fillPlayerFields() {
    if (!tournament) return;
    setDayNames(
      tournament.players
        .filter(player => player.bracket === 'DAY')
        .map(player => player.name)
        .join('\n'),
    );
    setNightNames(
      tournament.players
        .filter(player => player.bracket === 'NIGHT')
        .map(player => player.name)
        .join('\n'),
    );
  }

  function openMatch(match: Match) {
    setEditing(match);
    setSets(
      [0, 1, 2].map(
        index => match.sets[index]?.map(String) ?? ['', ''],
      ),
    );
  }

  function openOrganizer() {
    if (!data?.isOrganizer) {
      setModal('setup');
      return;
    }
    setModal('organizer');
  }

  function matchClass(match: Match) {
    return match.stage === 'F'
      ? ' shift-final'
      : match.bracket === 'DAY'
        ? ' shift-day'
        : ' shift-night';
  }

  function renderMatch(match: Match) {
    const result = score(match);
    const win = winner(match);
    const shift =
      match.stage === 'F'
        ? 'DIA × NOITE'
        : match.bracket
          ? bracketShortName(match.bracket).toUpperCase()
          : '';

    return (
      <button
        key={match.id}
        className={'match-card ' + (win ? 'finished' : '') + matchClass(match)}
        disabled={!data?.isOrganizer || busy}
        onClick={() => openMatch(match)}
        aria-label={`${playerName(match.a)} contra ${playerName(match.b)}${
          win ? ', resultado registrado' : ', registrar resultado'
        }`}
      >
        <div className="match-meta">
          <span>
            {stageDay(match.stage).toUpperCase()} · {stageName(match.stage).toUpperCase()}
            {match.stage !== 'F' && ` ${match.slot}`} · {shift}
          </span>
          <span className={win ? 'status-done' : 'status-next'}>
            {win ? 'Encerrada' : 'A jogar'}
          </span>
        </div>

        {[match.a, match.b].map((id, index) => (
          <div
            className={'match-player ' + (win === id ? 'victor' : '')}
            key={id}
          >
            <span>
              <Avatar
                name={playerName(id)}
                index={
                  tournament?.players.findIndex(player => player.id === id) ?? 0
                }
              />
              {playerName(id)}
              {win === id && <Check size={15} />}
            </span>
            <strong>{win ? result[index] : '–'}</strong>
          </div>
        ))}

        <div className="match-foot">
          {win ? (
            <span>{match.sets.map(set => set.join('–')).join(' / ')}</span>
          ) : (
            <span>{formatName(match.stage)}</span>
          )}
          {data?.isOrganizer && (
            <span>
              {win ? 'Ver resultado' : 'Registrar'} <ChevronRight size={14} />
            </span>
          )}
        </div>
      </button>
    );
  }

  function renderRanking() {
    const rows = standings(tournament!);

    return (
      <section className="group-card ranking-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Jogador</TableHead>
              <TableHead>Chave</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="num">J</TableHead>
              <TableHead className="num">V</TableHead>
              <TableHead className="num">D</TableHead>
              <TableHead className="num">Sets</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((player, index) => (
              <TableRow key={player.id}>
                <TableCell className="rank-cell">
                  {player.rank ? player.rank + 'º' : '—'}
                </TableCell>
                <TableCell>
                  <span className="table-player">
                    <Avatar name={player.name} index={index} />
                    {player.name}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={'shift-pill ' + player.bracket.toLowerCase()}>
                    {player.bracket === 'DAY' ? <Sun size={13} /> : <Moon size={13} />}
                    {bracketShortName(player.bracket)}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      'player-status ' + (player.rank === 1 ? 'winner-status' : '')
                    }
                  >
                    {player.status}
                  </span>
                </TableCell>
                <TableCell className="num muted">{player.played}</TableCell>
                <TableCell className="num bold">{player.wins}</TableCell>
                <TableCell className="num muted">{player.losses}</TableCell>
                <TableCell className="num">
                  {player.sw}–{player.sl}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!rows.length && (
          <div className="group-empty">
            <Users size={25} />
            <p>Aguardando os jogadores das chaves do Dia e da Noite.</p>
          </div>
        )}
      </section>
    );
  }

  function placeholderText(stage: Stage, slot: number, bracket?: Bracket) {
    if (stage === 'ELIM') return `Confronto ${slot}`;
    if (stage === 'QF')
      return `Vencedores das eliminatórias ${slot * 2 - 1} e ${slot * 2}`;
    if (stage === 'SF') return 'Vencedores das quartas';
    return 'Vencedor do Dia × Vencedor da Noite';
  }

  function renderStage(stage: Stage, slots: number, bracket?: Bracket) {
    return (
      <section className="bracket-stage">
        <h3>
          {stageName(stage).toUpperCase()}
          <small>
            {stageDay(stage)} · {formatName(stage)}
          </small>
        </h3>

        {Array.from({ length: slots }, (_, index) => {
          const slot = index + 1;
          const match = tournament?.matches.find(
            item =>
              item.stage === stage &&
              item.slot === slot &&
              item.bracket === bracket,
          );

          return match ? (
            renderMatch(match)
          ) : (
            <div className="placeholder-match" key={`${bracket ?? 'FINAL'}-${stage}-${slot}`}>
              <b>{placeholderText(stage, slot, bracket)}</b>
              <p>
                {stage === 'ELIM'
                  ? 'Aguardando o sorteio'
                  : stage === 'QF'
                    ? 'Aguardando as eliminatórias'
                    : stage === 'SF'
                      ? 'Aguardando as quartas'
                      : 'Aguardando as semifinais'}
              </p>
            </div>
          );
        })}
      </section>
    );
  }

  function renderShiftBracket(bracket: Bracket) {
    return (
      <section
        className={
          'shift-bracket ' + (bracket === 'DAY' ? 'day-bracket' : 'night-bracket')
        }
      >
        <header>
          <span className="shift-symbol">
            {bracket === 'DAY' ? <Sun size={20} /> : <Moon size={20} />}
          </span>
          <div>
            <small>{bracket === 'DAY' ? 'TURNO DIURNO' : 'TURNO NOTURNO'}</small>
            <h3>{bracketName(bracket)}</h3>
          </div>
          <b>8 JOGADORES</b>
        </header>

        <div className="shift-bracket-flow">
          {renderStage('ELIM', 4, bracket)}
          <span className="bracket-arrow">
            <ChevronRight />
          </span>
          {renderStage('QF', 2, bracket)}
          <span className="bracket-arrow">
            <ChevronRight />
          </span>
          {renderStage('SF', 1, bracket)}
        </div>
      </section>
    );
  }

  function renderPlayers(bracket: Bracket) {
    const players =
      tournament?.players.filter(player => player.bracket === bracket) ?? [];

    return (
      <section className="shift-player-section">
        <div className="shift-player-heading">
          <span className={bracket === 'DAY' ? 'day' : 'night'}>
            {bracket === 'DAY' ? <Sun size={18} /> : <Moon size={18} />}
          </span>
          <div>
            <small>{bracket === 'DAY' ? 'TURNO DIURNO' : 'TURNO NOTURNO'}</small>
            <h3>{bracketName(bracket)}</h3>
          </div>
          <b>{players.length}/8</b>
        </div>

        <div className="player-grid">
          {players.map((player, index) => (
            <div className="player-card" key={player.id}>
              <Avatar
                name={player.name}
                index={
                  tournament?.players.findIndex(item => item.id === player.id) ??
                  index
                }
              />
              <div>
                <h3>{player.name}</h3>
                <p>{standings(tournament!).find(row => row.id === player.id)?.status}</p>
              </div>
              <span className="player-number">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {!players.length && (
          <div className="empty-state compact-empty">
            <Users size={30} />
            <h3>Nenhum jogador cadastrado</h3>
            <p>A organização ainda não preencheu esta chave.</p>
          </div>
        )}
      </section>
    );
  }

  const filteredMatches =
    tournament?.matches.filter(
      match =>
        filter === 'all' ||
        (filter === 'next' && !winner(match)) ||
        (filter === 'done' && winner(match)) ||
        match.stage === filter ||
        match.bracket === filter,
    ) ?? [];

  return (
    <div className="arena">
      <ConfettiBurst token={celebrationToken} />
      <Toaster position="top-right" richColors />

      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-icon">
            <Table2 size={24} />
          </span>
          <span>
            arena<span className="brand-light">coca-cola</span>
            <small>TORNEIO · TÊNIS DE MESA</small>
          </span>
        </a>

        <span className="edition">DIA × NOITE · 16 JOGADORES</span>

        <div className="top-actions">
          <a
            className="display-link"
            href="/telao"
            target="_blank"
            rel="noreferrer"
            aria-label="Abrir modo telão"
            title="Modo telão"
          >
            <MonitorUp size={17} />
          </a>
          <Button
            variant="outline"
            className="organizer-btn"
            onClick={openOrganizer}
            disabled={!data}
          >
            <LockKeyhole size={16} />
            {data?.isOrganizer ? 'Organizador' : 'Área do organizador'}
          </Button>
        </div>
      </header>

      <main>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              COCA-COLA <span>/</span> TORNEIO DE TÊNIS DE MESA
            </div>
            <h1>
              Duas chaves.
              <br className="mobile-break" /> Um campeão<span>.</span>
            </h1>
            <p>
              Dia e Noite avançam em caminhos separados até o confronto que decide
              o campeão geral.
            </p>
          </div>
          <div className="phase-badge">
            <span className="pulse" />
            {phase}
          </div>
        </div>

        {error && (
          <div className="error-box" role="alert">
            {error}
            <Button variant="outline" onClick={load}>
              <RefreshCw size={16} />
              Tentar novamente
            </Button>
          </div>
        )}

        {!data && !error ? (
          <div className="loading">
            <LoaderCircle className="spin" />
            Carregando o torneio…
          </div>
        ) : (
          data &&
          tournament && (
            <>
              <div className="stats">
                <div>
                  <span className="stat-icon">
                    <Users />
                  </span>
                  <section>
                    <small>JOGADORES</small>
                    <strong>
                      {String(tournament.players.length).padStart(2, '0')}
                      <em>/ 16</em>
                    </strong>
                  </section>
                </div>

                <div>
                  <span className="stat-icon">
                    <Sun />
                  </span>
                  <section>
                    <small>CHAVES</small>
                    <strong>
                      {dayCount} + {nightCount}
                      <em>Dia / Noite</em>
                    </strong>
                  </section>
                </div>

                <div>
                  <span className="stat-icon">
                    <Activity />
                  </span>
                  <section>
                    <small>PARTIDAS ENCERRADAS</small>
                    <strong>
                      {String(done).padStart(2, '0')}
                      <em>/ {TOTAL_MATCHES}</em>
                    </strong>
                  </section>
                </div>

                <div className="format-stat">
                  <span className="stat-icon">
                    <Trophy />
                  </span>
                  <section>
                    <small>SEMANA DO TORNEIO</small>
                    <strong>
                      3 dias
                      <em>quarta → sexta</em>
                    </strong>
                  </section>
                </div>
              </div>

              <Tabs value={tab} onValueChange={setTab}>
                <div className="nav-row">
                  <TabsList variant="line" className="main-tabs">
                    <TabsTrigger value="overview">Visão geral</TabsTrigger>
                    <TabsTrigger value="matches">
                      Partidas <span className="count">{TOTAL_MATCHES}</span>
                    </TabsTrigger>
                    <TabsTrigger value="players">Jogadores</TabsTrigger>
                    <TabsTrigger value="bracket">Chaveamento</TabsTrigger>
                  </TabsList>
                  <span className="auto-update">
                    <RefreshCw size={13} /> Atualização automática
                  </span>
                </div>

                <TabsContent value="overview">
                  <div className="overview-layout">
                    <div className="main-column">
                      <div className="section-heading">
                        <div>
                          <h2>Classificação do torneio</h2>
                          <p>
                            Dia e Noite avançam separadamente até a Grande Final.
                          </p>
                        </div>
                        <span className="outline-pill">DIA × NOITE</span>
                      </div>

                      {renderRanking()}

                      <div className="table-key">
                        J: jogos · V: vitórias · D: derrotas · Sets:
                        ganhos–perdidos. Eliminados na mesma fase dividem a
                        posição.
                      </div>

                      <div className="section-heading next-heading">
                        <div>
                          <h2>
                            {champion ? 'Últimos resultados' : 'Próximos confrontos'}
                          </h2>
                          <p>
                            {tournament.started
                              ? 'A rivalidade entre os turnos cresce até a final de sexta.'
                              : 'Cadastre 8 jogadores no Dia e 8 na Noite para começar.'}
                          </p>
                        </div>
                        <button
                          className="text-link"
                          onClick={() => setTab('matches')}
                        >
                          Ver partidas <ArrowUpRight size={16} />
                        </button>
                      </div>

                      {tournament.started ? (
                        <div className="match-grid">
                          {(champion
                            ? tournament.matches.slice(-4)
                            : tournament.matches
                                .filter(match => !winner(match))
                                .slice(0, 4)
                          ).map(match => renderMatch(match))}
                        </div>
                      ) : (
                        <div className="start-panel dual-start-panel">
                          <span className="start-icon">
                            <Shuffle size={28} />
                          </span>
                          <div>
                            <h3>Dia contra Noite começa aqui.</h3>
                            <p>
                              Cadastre 8 jogadores em cada turno. O sorteio acontece
                              dentro de cada chave.
                            </p>
                          </div>
                          <div className="start-shift-counts">
                            <span>
                              <Sun size={14} /> Dia <b>{dayCount}/8</b>
                            </span>
                            <span>
                              <Moon size={14} /> Noite <b>{nightCount}/8</b>
                            </span>
                          </div>
                          {data.isOrganizer ? (
                            <Button
                              className="primary-btn"
                              onClick={() => {
                                fillPlayerFields();
                                setModal(
                                  dayCount === 8 && nightCount === 8
                                    ? 'start'
                                    : 'players',
                                );
                              }}
                            >
                              {dayCount === 8 && nightCount === 8
                                ? 'Sortear e iniciar'
                                : 'Cadastrar jogadores'}
                              <ArrowRight size={17} />
                            </Button>
                          ) : (
                            <span className="waiting-label">
                              Aguardando organização
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <aside>
                      <div className="journey">
                        <div className="journey-top">
                          <Trophy size={22} />
                          <span>SEMANA DO TORNEIO</span>
                        </div>
                        <h2>
                          {champion
                            ? playerName(champion)
                            : 'Dia × Noite.\nAté a grande final.'}
                        </h2>
                        <p>
                          {champion
                            ? 'Campeão geral do torneio. Parabéns pela conquista!'
                            : 'Três dias de torneio, de quarta até sexta.'}
                        </p>

                        <div className="steps four-steps">
                          <div className={tournament.started ? 'active' : ''}>
                            <span>01</span>
                            <section>
                              <b>Quarta · Eliminatórias</b>
                              <small>8 partidas · melhor de 3</small>
                            </section>
                            {tournament.matches.filter(
                              match => match.stage === 'ELIM' && winner(match),
                            ).length === 8 && <Check size={17} />}
                          </div>

                          <div
                            className={
                              tournament.matches.some(match => match.stage === 'QF')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>02</span>
                            <section>
                              <b>Quinta · Quartas</b>
                              <small>4 partidas · melhor de 3</small>
                            </section>
                          </div>

                          <div
                            className={
                              tournament.matches.some(match => match.stage === 'SF')
                                ? 'active'
                                : ''
                            }
                          >
                            <span>03</span>
                            <section>
                              <b>Quinta · Semifinais</b>
                              <small>Dia e Noite definem seus finalistas</small>
                            </section>
                          </div>

                          <div className={final ? 'active' : ''}>
                            <span>04</span>
                            <section>
                              <b>Sexta · Grande Final</b>
                              <small>Melhor do Dia × Melhor da Noite</small>
                            </section>
                            <Trophy size={17} />
                          </div>
                        </div>

                        <div className="journey-progress">
                          <span>
                            Partidas concluídas
                            <b>{Math.round((done / TOTAL_MATCHES) * 100)}%</b>
                          </span>
                          <Progress value={(done / TOTAL_MATCHES) * 100} />
                        </div>
                      </div>

                      <div className="rules">
                        <h3>
                          Dentro das regras <ShieldCheck size={18} />
                        </h3>
                        <p>
                          <b>Todas as partidas: melhor de 3</b>
                          <br />
                          Vence quem conquistar 2 sets primeiro.
                        </p>
                        <p>
                          <b>11 pontos por set</b>
                          <br />
                          Sempre com 2 pontos de vantagem.
                        </p>
                        <p>
                          <b>Duas chaves independentes</b>
                          <br />
                          Dia e Noite só se enfrentam na Grande Final.
                        </p>
                        <div>
                          <LockKeyhole size={14} /> Resultados registrados pelo
                          organizador.
                        </div>
                      </div>
                    </aside>
                  </div>
                </TabsContent>

                <TabsContent value="matches">
                  <div className="section-heading">
                    <div>
                      <h2>Todos os confrontos</h2>
                      <p>
                        {data.isOrganizer
                          ? 'Selecione uma partida para registrar ou corrigir o placar.'
                          : 'Acompanhe o placar de cada fase do torneio.'}
                      </p>
                    </div>
                  </div>

                  <Tabs value={filter} onValueChange={setFilter}>
                    <TabsList className="filters">
                      <TabsTrigger value="all">Todas</TabsTrigger>
                      <TabsTrigger value="next">A jogar</TabsTrigger>
                      <TabsTrigger value="done">Encerradas</TabsTrigger>
                      <TabsTrigger value="DAY">Dia</TabsTrigger>
                      <TabsTrigger value="NIGHT">Noite</TabsTrigger>
                      <TabsTrigger value="ELIM">Eliminatórias</TabsTrigger>
                      <TabsTrigger value="QF">Quartas</TabsTrigger>
                      <TabsTrigger value="SF">Semis</TabsTrigger>
                      <TabsTrigger value="F">Final</TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <div className="all-matches">
                    {filteredMatches.map(match => renderMatch(match))}
                  </div>

                  {!filteredMatches.length && (
                    <div className="empty-state">
                      <Table2 size={35} />
                      <h3>Nenhuma partida por aqui</h3>
                      <p>
                        {tournament.started
                          ? 'Os confrontos aparecem conforme os vencedores avançam.'
                          : 'As eliminatórias serão geradas após o sorteio.'}
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="players">
                  <div className="section-heading">
                    <div>
                      <h2>Quem entra em quadra</h2>
                      <p>
                        {dayCount}/8 no Dia · {nightCount}/8 na Noite.
                      </p>
                    </div>

                    {data.isOrganizer && (
                      <div className="flex flex-wrap justify-end gap-2">
                        {!tournament.started && (
                          <Button
                            className="primary-btn"
                            onClick={() => {
                              fillPlayerFields();
                              setModal('players');
                            }}
                          >
                            <Plus size={16} />
                            Cadastrar jogadores
                          </Button>
                        )}
                        {(tournament.players.length > 0 ||
                          tournament.matches.length > 0) && (
                          <Button
                            variant="destructive"
                            onClick={() => setModal('reset')}
                          >
                            <RotateCcw size={16} />
                            Resetar torneio
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="players-by-shift">
                    {renderPlayers('DAY')}
                    {renderPlayers('NIGHT')}
                  </div>

                  {data.isOrganizer &&
                    dayCount === 8 &&
                    nightCount === 8 &&
                    !tournament.started && (
                      <Button
                        className="primary-btn"
                        onClick={() => setModal('start')}
                      >
                        <Shuffle size={16} />
                        Sortear as duas chaves e iniciar
                      </Button>
                    )}
                </TabsContent>

                <TabsContent value="bracket">
                  <div className="section-heading">
                    <div>
                      <h2>O caminho até a taça</h2>
                      <p>
                        Cada turno disputa sua própria chave. Os vencedores se
                        encontram apenas na final.
                      </p>
                    </div>
                    <span className="outline-pill">15 PARTIDAS</span>
                  </div>

                  <div className="dual-brackets">
                    {renderShiftBracket('DAY')}
                    {renderShiftBracket('NIGHT')}
                  </div>

                  <section className="grand-final-zone">
                    <div className="grand-final-title">
                      <span>
                        <Trophy size={22} />
                      </span>
                      <div>
                        <small>SEXTA-FEIRA</small>
                        <h3>Grande Final · Dia × Noite</h3>
                      </div>
                    </div>
                    <div className="grand-final-match">
                      {renderStage('F', 1)}
                    </div>
                  </section>

                  {champion && (
                    <div className="champion">
                      <Trophy size={44} />
                      <small>CAMPEÃO GERAL</small>
                      <h3>{playerName(champion)}</h3>
                      <p>
                        Vencedor da Grande Final entre Chave do Dia e Chave da
                        Noite.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )
        )}

        <footer>
          <span>
            arena<b>coca-cola</b> <span>· TÊNIS DE MESA</span>
          </span>
          <p>Dia × Noite. Competição, integração e respeito em cada ponto.</p>
          <span>16 JOGADORES · 15 PARTIDAS</span>
        </footer>
      </main>

      <Dialog
        open={modal !== null}
        onOpenChange={open => {
          if (!open && !busy) {
            setModal(null);
            setSelectedSnapshot(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === 'players'
                ? 'Jogadores do torneio'
                : modal === 'setup'
                  ? 'Ativar sua área de organização'
                  : modal === 'reset'
                    ? 'Resetar torneio'
                    : modal === 'organizer'
                      ? 'Painel do organizador'
                      : modal === 'history'
                        ? 'Histórico e backups'
                        : modal === 'restore'
                          ? 'Restaurar backup'
                          : 'Vamos começar o torneio?'}
            </DialogTitle>
            <DialogDescription>
              {modal === 'players'
                ? 'Cadastre até 8 jogadores no Dia e 8 na Noite. Os nomes não podem se repetir entre as chaves.'
                : modal === 'setup'
                  ? 'Digite a senha do organizador. Ela libera a administração somente neste navegador.'
                  : modal === 'reset'
                    ? 'O estado atual será salvo automaticamente no histórico antes de limpar as duas chaves.'
                    : modal === 'organizer'
                      ? 'Sua sessão está ativa. Gerencie o torneio, os backups e o modo telão por aqui.'
                      : modal === 'history'
                        ? 'Cada alteração importante gera uma cópia recuperável do estado anterior do torneio.'
                        : modal === 'restore'
                          ? 'O estado atual também será salvo antes da restauração, permitindo desfazer a troca se necessário.'
                          : 'Os jogadores serão sorteados apenas dentro de seus turnos. Dia e Noite só se encontram na final.'}
            </DialogDescription>
          </DialogHeader>

          {modal === 'players' && (
            <form
              onSubmit={async event => {
                event.preventDefault();
                if (
                  await mutate({
                    type: 'players',
                    dayNames: splitNames(dayNames),
                    nightNames: splitNames(nightNames),
                  })
                ) {
                  setModal(null);
                }
              }}
            >
              <div className="shift-input-grid">
                <div className="shift-input day-input">
                  <label className="form-label" htmlFor="day-names">
                    <Sun size={15} /> Chave do Dia
                  </label>
                  <textarea
                    id="day-names"
                    rows={10}
                    value={dayNames}
                    onChange={event => setDayNames(event.target.value)}
                    placeholder="Um jogador por linha"
                  />
                  <span>{splitNames(dayNames).length}/8 jogadores</span>
                </div>

                <div className="shift-input night-input">
                  <label className="form-label" htmlFor="night-names">
                    <Moon size={15} /> Chave da Noite
                  </label>
                  <textarea
                    id="night-names"
                    rows={10}
                    value={nightNames}
                    onChange={event => setNightNames(event.target.value)}
                    placeholder="Um jogador por linha"
                  />
                  <span>{splitNames(nightNames).length}/8 jogadores</span>
                </div>
              </div>

              <div className="form-footer">
                <span>
                  {splitNames(dayNames).length + splitNames(nightNames).length}/16
                  participantes
                </span>
                <Button className="primary-btn" disabled={busy}>
                  {busy ? 'Salvando…' : 'Salvar jogadores'}
                </Button>
              </div>
            </form>
          )}

          {modal === 'setup' && (
            <form
              onSubmit={async event => {
                event.preventDefault();
                if (await mutate({ type: 'claim', key: key.trim() })) {
                  setKey('');
                  setModal(null);
                }
              }}
            >
              <label className="form-label" htmlFor="key">
                Senha do organizador
              </label>
              <Input
                id="key"
                type="password"
                required
                value={key}
                onChange={event => setKey(event.target.value)}
                autoComplete="current-password"
              />
              <Button className="primary-btn full mt-4" disabled={busy}>
                {data?.organizerConfigured
                  ? 'Entrar como organizador'
                  : 'Senha pendente no Vercel'}
              </Button>
            </form>
          )}

          {modal === 'organizer' && (
            <div className="organizer-panel">
              <div className="organizer-session">
                <span>
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <b>Sessão de organizador ativa</b>
                  <small>
                    Alterações protegidas neste navegador por até 12 horas.
                  </small>
                </div>
              </div>

              <div className="organizer-actions">
                {!tournament?.started && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      fillPlayerFields();
                      setModal('players');
                    }}
                  >
                    <Users size={16} />
                    Gerenciar jogadores
                  </Button>
                )}

                {tournament?.started && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setModal(null);
                      setTab('matches');
                    }}
                  >
                    <Table2 size={16} />
                    Registrar resultados
                  </Button>
                )}

                <Button variant="outline" onClick={() => setModal('history')}>
                  <History size={16} />
                  Histórico e backups
                  <span className="action-count">
                    {tournament?.history?.length ?? 0}
                  </span>
                </Button>

                <Button variant="outline" asChild>
                  <a href="/telao" target="_blank" rel="noreferrer">
                    <MonitorUp size={16} />
                    Abrir modo telão
                  </a>
                </Button>

                {((tournament?.players.length ?? 0) > 0 ||
                  (tournament?.matches.length ?? 0) > 0) && (
                  <Button
                    variant="destructive"
                    onClick={() => setModal('reset')}
                  >
                    <RotateCcw size={16} />
                    Resetar torneio
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (
                      await mutate(
                        { type: 'logout' },
                        'Sessão do organizador encerrada.',
                      )
                    ) {
                      setModal(null);
                      setSelectedSnapshot(null);
                    }
                  }}
                >
                  <LogOut size={16} />
                  Sair da área do organizador
                </Button>
              </div>
            </div>
          )}

          {modal === 'history' && (
            <div className="history-list">
              {(tournament?.history?.length ?? 0) === 0 ? (
                <div className="history-empty">
                  <History size={28} />
                  <b>Nenhum backup ainda</b>
                  <p>
                    Os backups aparecerão conforme você altera jogadores, inicia
                    o torneio, registra resultados ou faz um reset.
                  </p>
                </div>
              ) : (
                tournament?.history?.map(item => (
                  <div className="history-item" key={item.id}>
                    <div>
                      <b>{item.label}</b>
                      <small>
                        {historyDate(item.createdAt)} ·{' '}
                        {item.tournament.players.length} jogadores ·{' '}
                        {item.tournament.matches.filter(winner).length}/
                        {TOTAL_MATCHES} partidas concluídas
                      </small>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSnapshot(item);
                        setModal('restore');
                      }}
                    >
                      <ArchiveRestore size={14} />
                      Restaurar
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          {modal === 'restore' && selectedSnapshot && (
            <div className="restore-confirm">
              <div className="restore-summary">
                <b>{selectedSnapshot.label}</b>
                <span>{historyDate(selectedSnapshot.createdAt)}</span>
                <p>
                  {selectedSnapshot.tournament.players.length} jogadores ·{' '}
                  {selectedSnapshot.tournament.matches.filter(winner).length}{' '}
                  partidas concluídas ·{' '}
                  {selectedSnapshot.tournament.started
                    ? 'torneio iniciado'
                    : 'inscrições'}
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setModal('history')}
                >
                  Voltar
                </Button>
                <Button
                  type="button"
                  className="primary-btn"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(
                        {
                          type: 'restore',
                          snapshotId: selectedSnapshot.id,
                        },
                        'Backup restaurado.',
                      )
                    ) {
                      setModal(null);
                      setSelectedSnapshot(null);
                      setTab('overview');
                      setEditing(null);
                      setFilter('all');
                    }
                  }}
                >
                  {busy ? 'Restaurando…' : 'Restaurar este backup'}
                </Button>
              </div>
            </div>
          )}

          {modal === 'start' && (
            <Button
              className="primary-btn"
              disabled={busy}
              onClick={async () => {
                if (
                  await mutate(
                    { type: 'start' },
                    'As duas chaves foram sorteadas. Torneio iniciado.',
                  )
                ) {
                  setModal(null);
                  setTab('bracket');
                }
              }}
            >
              {busy ? 'Preparando…' : 'Sortear Dia e Noite'}
            </Button>
          )}

          {modal === 'reset' && (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setModal('organizer')}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  if (
                    await mutate(
                      { type: 'reset' },
                      'Torneio resetado. Backup salvo no histórico.',
                    )
                  ) {
                    setModal(null);
                    setTab('overview');
                    setDayNames('');
                    setNightNames('');
                    setFilter('all');
                    setEditing(null);
                  }
                }}
              >
                {busy ? 'Resetando…' : 'Sim, resetar torneio'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!editing}
        onOpenChange={open => {
          if (!open && !busy) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resultado da partida</DialogTitle>
            <DialogDescription>
              Melhor de 3 sets: vence quem ganhar 2. Deixe o 3º set vazio em caso de 2 × 0.
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <form
              onSubmit={async event => {
                event.preventDefault();
                try {
                  const value = sets
                    .filter(set => set.some(point => point !== ''))
                    .map(set =>
                      set.map(point => (point === '' ? NaN : Number(point))),
                    );
                  validateSets(value, editing.stage);
                  if (
                    await mutate(
                      {
                        type: 'result',
                        id: editing.id,
                        sets: value,
                      },
                      editing.stage === 'F'
                        ? 'Grande Final encerrada.'
                        : 'Resultado registrado.',
                    )
                  ) {
                    setEditing(null);
                  }
                } catch (cause) {
                  toast.error(
                    cause instanceof Error ? cause.message : 'Confira o placar.',
                  );
                }
              }}
            >
              <div className="match-edit-context">
                <span>
                  {stageDay(editing.stage)} · {stageName(editing.stage)}
                </span>
                <b>
                  {editing.stage === 'F'
                    ? 'Dia × Noite'
                    : editing.bracket
                      ? bracketName(editing.bracket)
                      : ''}
                </b>
              </div>

              <div className="score-header">
                <b>{playerName(editing.a)}</b>
                <span>×</span>
                <b>{playerName(editing.b)}</b>
              </div>

              {sets.map((set, index) => (
                <div className="set-row" key={index}>
                  <Input
                    aria-label={`${playerName(editing.a)}, set ${index + 1}`}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="999"
                    value={set[0]}
                    onChange={event =>
                      setSets(old =>
                        old.map((row, rowIndex) =>
                          rowIndex === index
                            ? [event.target.value, row[1]]
                            : row,
                        ),
                      )
                    }
                  />
                  <span>SET {index + 1}</span>
                  <Input
                    aria-label={`${playerName(editing.b)}, set ${index + 1}`}
                    inputMode="numeric"
                    type="number"
                    min="0"
                    max="999"
                    value={set[1]}
                    onChange={event =>
                      setSets(old =>
                        old.map((row, rowIndex) =>
                          rowIndex === index
                            ? [row[0], event.target.value]
                            : row,
                        ),
                      )
                    }
                  />
                </div>
              ))}

              <Button className="primary-btn full mt-4" disabled={busy}>
                {busy ? 'Salvando…' : 'Salvar resultado'}
              </Button>

              {editing.sets.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  className="full mt-2"
                  disabled={busy}
                  onClick={async () => {
                    if (
                      await mutate(
                        {
                          type: 'result',
                          id: editing.id,
                          clear: true,
                        },
                        'Resultado removido.',
                      )
                    ) {
                      setEditing(null);
                    }
                  }}
                >
                  Remover resultado registrado
                </Button>
              )}
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
