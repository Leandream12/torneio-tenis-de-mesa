'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Maximize2,
  Moon,
  RefreshCw,
  Sun,
  Table2,
  Trophy,
  Wifi,
  WifiOff,
} from 'lucide-react';
import ConfettiBurst from '@/components/confetti-burst';
import {
  bracketName,
  bracketShortName,
  formatName,
  score,
  stageDay,
  stageName,
  winner,
  type Bracket,
  type Match,
  type Stage,
  type Tournament,
} from '@/lib/tournament';

type Data = {
  tournament: Tournament;
  version: number;
};

const TOTAL_MATCHES = 15;

export default function Telao() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/tournament', { cache: 'no-store' });
      const next = (await response.json()) as Data & { error?: string };
      if (!response.ok) throw new Error(next.error || 'Falha ao atualizar.');
      setData(next);
      setError('');
      setLastUpdate(new Date());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao atualizar.');
    }
  }, []);

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    load();
    const id = window.setInterval(load, 8000);

    return () => {
      window.clearInterval(id);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [load]);

  const tournament = data?.tournament;
  const final = tournament?.matches.find(match => match.stage === 'F');
  const champion = final && winner(final);
  const celebrationToken =
    champion && final
      ? `${champion}:${final.sets.map(set => set.join('-')).join('/')}`
      : null;

  const done = tournament?.matches.filter(winner).length ?? 0;
  const playerName = (id: string) =>
    tournament?.players.find(player => player.id === id)?.name ?? 'A definir';

  const phase = champion
    ? 'TORNEIO ENCERRADO'
    : final
      ? 'GRANDE FINAL'
      : tournament?.matches.some(match => match.stage === 'SF')
        ? 'SEMIFINAIS'
        : tournament?.matches.some(match => match.stage === 'QF')
          ? 'QUARTAS DE FINAL'
          : tournament?.started
            ? 'ELIMINATÓRIAS'
            : 'INSCRIÇÕES';

  const orderedPending =
    tournament?.matches
      .filter(match => !winner(match))
      .sort((a, b) => {
        const order: Record<Stage, number> = { ELIM: 0, QF: 1, SF: 2, F: 3 };
        return order[a.stage] - order[b.stage];
      }) ?? [];

  const nextMatch = orderedPending[0];

  function matchCard(match: Match) {
    const result = score(match);
    const win = winner(match);
    const shift =
      match.stage === 'F'
        ? 'DIA × NOITE'
        : match.bracket
          ? bracketShortName(match.bracket).toUpperCase()
          : '';

    return (
      <div
        className={
          'display-match ' +
          (win ? 'display-match-done ' : '') +
          (match.stage === 'F'
            ? 'display-final'
            : match.bracket === 'DAY'
              ? 'display-day'
              : 'display-night')
        }
        key={match.id}
      >
        <div className="display-match-meta">
          <span>
            {stageDay(match.stage).toUpperCase()} · {stageName(match.stage).toUpperCase()}
            {match.stage !== 'F' ? ` ${match.slot}` : ''} · {shift}
          </span>
          <b>{win ? 'ENCERRADA' : 'A JOGAR'}</b>
        </div>

        {[match.a, match.b].map((id, index) => (
          <div
            className={'display-player ' + (win === id ? 'display-winner' : '')}
            key={id}
          >
            <span>{playerName(id)}</span>
            <strong>{win ? result[index] : '–'}</strong>
          </div>
        ))}

        <div className="display-match-foot">
          <span>{formatName(match.stage)}</span>
          <span>
            {win
              ? match.sets.map(set => set.join('–')).join(' / ')
              : 'Aguardando resultado'}
          </span>
        </div>
      </div>
    );
  }

  function placeholder(stage: Stage, slot: number, bracket?: Bracket) {
    const label =
      stage === 'ELIM'
        ? `Confronto ${slot}`
        : stage === 'QF'
          ? `Vencedores ${slot * 2 - 1} e ${slot * 2}`
          : stage === 'SF'
            ? 'Vencedores das quartas'
            : 'Vencedor do Dia × Vencedor da Noite';

    return (
      <div className="display-match display-placeholder" key={`${bracket ?? 'F'}-${stage}-${slot}`}>
        <span>{label}</span>
        <b>Aguardando definição</b>
      </div>
    );
  }

  function stage(stageNameValue: Stage, slots: number, bracket?: Bracket) {
    return (
      <section className="display-stage">
        <h2>{stageName(stageNameValue).toUpperCase()}</h2>
        <small>
          {stageDay(stageNameValue)} · {formatName(stageNameValue)}
        </small>

        <div className="display-stage-matches">
          {Array.from({ length: slots }, (_, index) => {
            const slot = index + 1;
            const match = tournament?.matches.find(
              item =>
                item.stage === stageNameValue &&
                item.slot === slot &&
                item.bracket === bracket,
            );
            return match ? matchCard(match) : placeholder(stageNameValue, slot, bracket);
          })}
        </div>
      </section>
    );
  }

  function bracket(bracketValue: Bracket) {
    return (
      <section
        className={
          'display-shift-bracket ' +
          (bracketValue === 'DAY' ? 'display-day-bracket' : 'display-night-bracket')
        }
      >
        <header>
          <span>
            {bracketValue === 'DAY' ? <Sun size={22} /> : <Moon size={22} />}
          </span>
          <div>
            <small>{bracketValue === 'DAY' ? 'TURNO DIURNO' : 'TURNO NOTURNO'}</small>
            <h2>{bracketName(bracketValue)}</h2>
          </div>
        </header>

        <div className="display-shift-flow">
          {stage('ELIM', 4, bracketValue)}
          <div className="display-connector">›</div>
          {stage('QF', 2, bracketValue)}
          <div className="display-connector">›</div>
          {stage('SF', 1, bracketValue)}
        </div>
      </section>
    );
  }

  async function fullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Alguns navegadores bloqueiam tela cheia fora de uma interação direta.
    }
  }

  return (
    <div className="display-page">
      <ConfettiBurst token={celebrationToken} />

      <header className="display-header">
        <div className="display-brand">
          <span>
            <Table2 size={24} />
          </span>
          <div>
            <b>
              arena<span>coca-cola</span>
            </b>
            <small>TORNEIO DE TÊNIS DE MESA</small>
          </div>
        </div>

        <div className="display-header-center">
          <small>FASE ATUAL</small>
          <strong>{phase}</strong>
        </div>

        <div className="display-header-actions">
          <span
            className={
              'display-connection ' + (!online || error ? 'offline' : '')
            }
          >
            {!online || error ? <WifiOff size={15} /> : <Wifi size={15} />}
            {!online ? 'SEM INTERNET' : error ? 'RECONECTANDO' : 'AO VIVO'}
          </span>
          <button onClick={fullscreen} aria-label="Alternar tela cheia">
            <Maximize2 size={18} />
            Tela cheia
          </button>
        </div>
      </header>

      {!tournament ? (
        <main className="display-loading">
          <RefreshCw className="spin" />
          <b>Carregando torneio…</b>
          {error && <span>{error}</span>}
        </main>
      ) : champion ? (
        <main className="display-champion-screen">
          <div className="display-champion-glow" />
          <Trophy size={92} />
          <small>CAMPEÃO GERAL · DIA × NOITE</small>
          <h1>{playerName(champion)}</h1>
          <p>15 partidas concluídas · campeão definido na Grande Final</p>
          <div className="display-final-card">{final && matchCard(final)}</div>
        </main>
      ) : (
        <main className="display-main display-main-dual">
          <section className="display-summary">
            <div>
              <small>TORNEIO INTERNO · DIA × NOITE</small>
              <h1>
                {tournament.started
                  ? 'Duas chaves. Um campeão.'
                  : 'A rivalidade começa aqui.'}
              </h1>
              <p>
                {tournament.started
                  ? 'Eliminatórias na terça, quartas na quarta, semifinais na quinta e a Grande Final na sexta.'
                  : `Aguardando 8 jogadores no Dia e 8 na Noite. ${tournament.players.length}/16 cadastrados.`}
              </p>
            </div>

            <div className="display-progress-card">
              <span>
                <b>{done}</b>/{TOTAL_MATCHES}
              </span>
              <small>PARTIDAS ENCERRADAS</small>
              <div>
                <i
                  style={{
                    width: `${Math.round((done / TOTAL_MATCHES) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {nextMatch && (
              <div className="display-next">
                <small>PRÓXIMO CONFRONTO</small>
                <strong>
                  {playerName(nextMatch.a)} <span>×</span>{' '}
                  {playerName(nextMatch.b)}
                </strong>
                <p>
                  {stageDay(nextMatch.stage)} · {stageName(nextMatch.stage)} ·{' '}
                  {nextMatch.stage === 'F'
                    ? 'Dia × Noite'
                    : nextMatch.bracket
                      ? bracketName(nextMatch.bracket)
                      : ''}
                </p>
              </div>
            )}
          </section>

          <section className="display-dual-brackets">
            {bracket('DAY')}
            {bracket('NIGHT')}
          </section>

          <section className="display-grand-final">
            <div className="display-grand-final-heading">
              <span>
                <Trophy size={24} />
              </span>
              <div>
                <small>SEXTA-FEIRA · MELHOR DE 3</small>
                <h2>Grande Final · Melhor do Dia × Melhor da Noite</h2>
              </div>
            </div>
            <div className="display-grand-final-card">
              {final ? matchCard(final) : placeholder('F', 1)}
            </div>
          </section>
        </main>
      )}

      <footer className="display-footer">
        <span>
          {lastUpdate
            ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}`
            : 'Sincronizando…'}
        </span>
        <span>Atualização automática a cada 8 segundos</span>
      </footer>
    </div>
  );
}
