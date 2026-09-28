import type { Metadata } from 'next';
import Telao from './telao';

export const metadata: Metadata = {
  title: 'Modo Telão | Torneio de Tênis de Mesa',
  description: 'Painel público em tela cheia com chaveamento e resultados do torneio.',
};

export default function TelaoPage() {
  return <Telao />;
}
