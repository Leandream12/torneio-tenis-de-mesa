'use client';

import { useCallback, useEffect, useState } from 'react';
import { Maximize2, RefreshCw, Table2, Trophy, Wifi, WifiOff } from 'lucide-react';
import ConfettiBurst from '@/components/confetti-burst';
import {
  formatName,
  score,
  stageName,
  winner,
  type Match,
  type Stage,
  type Tournament,
} from '@/lib/tournament';

type Data = {
  tournament: Tournament;
  version: number;
};

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

  const t = data?.tournament;
  const final = t?.matches.find(match => match.stage === 'F');
  const champion = final && winner(final);
  const celebrationToken = champion && final
    ? `${champion}:${final.sets.map(set => set.join('-')).join('/')}`
    : null;
  const done = t?.matches.filter(winner).length ?? 0;
  const nextMatch = t?.matches.find(match => !winner(match));
  const playerName = (id: string) => t?.players.find(player => player.id === id)?.name ?? 'A definir';
  const phase = champion
    ? 'TORNEIO ENCERRADO'
    : final
      ? 'GRANDE FINAL'
      : t?.matches.some(match => match.stage === 'SF')
        ? 'SEMIFINAIS'
        : t?.started
          ? 'QUARTAS DE FINAL'
          : 'INSCRIÇÕES';

  function matchCard(match: Match) {
    const result = score(match);
    const win = winner(match);
    return (
      <div className={'display-match ' + (win ? 'display-match-done' : '')} key={match.id}>
        <div className="display-match-meta">
          <span>{stageName(match.stage).toUpperCase()}{match.stage === 'F' ? '' : ` · ${match.slot}`}</span>
          <b>{win ? 'ENCERRADA' : 'A JOGAR'}</b>
        </div>
        {[match.a, match.b].map((id, index) => (
          <div className={'display-player ' + (win === id ? 'display-winner' : '')} key={id}>
            <span>{playerName(id)}</span>
            <strong>{win ? result[index] : '–'}</strong>
          </div>
        ))}
        <div className="display-match-foot">
          <span>{formatName(match.stage)}</span>
          <span>{win ? match.sets.map(set => set.join('–')).join(' / ') : 'Aguardando resultado'}</span>
        </div>
      </div>
    );
  }

  function stage(stage: Stage, slots: number) {
    return (
      <section className="display-stage">
        <h2>{stage === 'SF' ? 'SEMIFINAIS' : stageName(stage).toUpperCase()}</h2>
        <small>{formatName(stage)}</small>
        <div className="display-stage-matches">
          {Array.from({ length: slots }, (_, index) => {
            const slot = index + 1;
            const match = t?.matches.find(item => item.stage === stage && item.slot === slot);
            if (match) return matchCard(match);
            return (
              <div className="display-match display-placeholder" key={`${stage}-${slot}`}>
                <span>
                  {stage === 'QF'
                    ? `Confronto ${slot}`
                    : stage === 'SF'
                      ? `Vencedores das quartas`
                      : 'Vencedores das semifinais'}
                </span>
                <b>Aguardando definição</b>
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  async function fullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      // O navegador pode bloquear tela cheia fora de uma interação direta.
    }
  }

  return (
    <div className="display-page">
      <ConfettiBurst token={celebrationToken} />
      <header className="display-header">
        <div className="display-brand">
          <span><Table2 size={24} /></span>
          <div>
            <b>arena<span>coca-cola</span></b>
            <small>TORNEIO DE TÊNIS DE MESA</small>
          </div>
        </div>
        <div className="display-header-center">
          <small>FASE ATUAL</small>
          <strong>{phase}</strong>
        </div>
        <div className="display-header-actions">
          <span className={'display-connection ' + (!online || error ? 'offline' : '')}>
            {!online || error ? <WifiOff size={15} /> : <Wifi size={15} />}
            {!online ? 'SEM INTERNET' : error ? 'RECONECTANDO' : 'AO VIVO'}
          </span>
          <button onClick={fullscreen} aria-label="Alternar tela cheia">
            <Maximize2 size={18} /> Tela cheia
          </button>
        </div>
      </header>

      {!t ? (
        <main className="display-loading">
          <RefreshCw className="spin" />
          <b>Carregando torneio…</b>
          {error && <span>{error}</span>}
        </main>
      ) : champion ? (
        <main className="display-champion-screen">
          <div className="display-champion-glow" />
          <Trophy size={92} />
          <small>CAMPEÃO DO TORNEIO</small>
          <h1>{playerName(champion)}</h1>
          <p>7 partidas concluídas · título definido</p>
          <div className="display-final-card">{final && matchCard(final)}</div>
        </main>
      ) : (
        <main className="display-main">
          <section className="display-summary">
            <div>
              <small>TORNEIO INTERNO</small>
              <h1>{t.started ? 'O caminho até a taça.' : 'A mesa está pronta.'}</h1>
              <p>
                {t.started
                  ? 'Acompanhe cada confronto até a grande final.'
                  : `Aguardando os 8 jogadores. ${t.players.length}/8 cadastrados.`}
              </p>
            </div>
            <div className="display-progress-card">
              <span><b>{done}</b>/7</span>
              <small>PARTIDAS ENCERRADAS</small>
              <div><i style={{ width: `${Math.round((done / 7) * 100)}%` }} /></div>
            </div>
            {nextMatch && (
              <div className="display-next">
                <small>PRÓXIMO CONFRONTO</small>
                <strong>{playerName(nextMatch.a)} <span>×</span> {playerName(nextMatch.b)}</strong>
                <p>{stageName(nextMatch.stage)} · {formatName(nextMatch.stage)}</p>
              </div>
            )}
          </section>

          <section className="display-bracket">
            {stage('QF', 4)}
            <div className="display-connector">›</div>
            {stage('SF', 2)}
            <div className="display-connector">›</div>
            {stage('F', 1)}
          </section>
        </main>
      )}

      <footer className="display-footer">
        <span>{lastUpdate ? `Atualizado às ${lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Sincronizando…'}</span>
        <span>Atualização automática a cada 8 segundos</span>
      </footer>
    </div>
  );
}
