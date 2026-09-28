'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

type ConfettiBurstProps = {
  token: string | null | false | undefined;
};

type ConfettiStyle = CSSProperties & {
  '--burst-x': string;
  '--burst-y': string;
  '--drift-x': string;
  '--spin': string;
  '--delay': string;
  '--confetti-color': string;
  '--confetti-scale': string;
};

const COLORS = ['#ffffff', '#ef171f', '#191919', '#ffd166', '#ff6b70'];

export default function ConfettiBurst({ token }: ConfettiBurstProps) {
  const [active, setActive] = useState(false);

  const pieces = useMemo(() => {
    return Array.from({ length: 72 }, (_, index) => {
      const angle = ((index * 137.508) % 360) * (Math.PI / 180);
      const radius = 170 + (index % 9) * 23;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius * 0.5 - 125;
      const drift = x + ((index % 7) - 3) * 42;
      const spin = ((index * 113) % 900) - 450;
      const delay = (index % 10) * 0.035;
      const scale = 0.7 + (index % 5) * 0.1;

      const style: ConfettiStyle = {
        '--burst-x': `${x.toFixed(1)}px`,
        '--burst-y': `${y.toFixed(1)}px`,
        '--drift-x': `${drift.toFixed(1)}px`,
        '--spin': `${spin}deg`,
        '--delay': `${delay.toFixed(3)}s`,
        '--confetti-color': COLORS[index % COLORS.length],
        '--confetti-scale': String(scale),
      };

      return style;
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setActive(false);
      return;
    }

    const key = `arena-champion-celebration:${token}`;

    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // A celebração continua funcionando mesmo quando o storage estiver indisponível.
    }

    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 4600);
    return () => window.clearTimeout(timer);
  }, [token]);

  if (!active) return null;

  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((style, index) => (
        <i className={'confetti-piece confetti-shape-' + (index % 3)} style={style} key={index} />
      ))}
    </div>
  );
}
