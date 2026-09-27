import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Arena Solar | Torneio de Tênis de Mesa",
  description: "SIPAT Grupo Solar: mata-mata com 8 jogadores. Quartas em set único; semifinais e final em melhor de 3 sets.",
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
