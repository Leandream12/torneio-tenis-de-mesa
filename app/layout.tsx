import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Coca-Cola | Torneio de Tênis de Mesa",
  description: "Torneio interno de tênis de mesa: 16 jogadores divididos entre Chave do Dia e Chave da Noite, com final entre os vencedores.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
