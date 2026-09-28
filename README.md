# Arena Coca-Cola — Torneio de Tênis de Mesa

Site para acompanhar e administrar um torneio interno de tênis de mesa com **8 jogadores em mata-mata**. A aplicação foi criada para exibir o chaveamento, resultados, classificação e campeão em tempo real, com uma área de administração protegida por senha.

## Formato do torneio

| Fase | Partidas | Formato | Vitória |
| --- | ---: | --- | --- |
| Quartas de final | 4 | Set único | Vencer 1 set |
| Semifinais | 2 | Melhor de 3 sets | Vencer 2 sets |
| Final | 1 | Melhor de 3 sets | Vencer 2 sets |

**Total: 7 partidas.**

Cada set vai até **11 pontos**, sempre com diferença mínima de 2 pontos. Após 10 × 10, o set continua até que um jogador abra dois pontos de vantagem.

## Funcionalidades

- cadastro de até 8 jogadores;
- sorteio automático das quartas de final;
- avanço automático dos vencedores;
- quartas em set único;
- semifinais e final em melhor de 3 sets;
- classificação com jogos, vitórias, derrotas e sets;
- atualização automática da tela a cada 20 segundos;
- correção e remoção de resultados pelo organizador;
- destaque automático do campeão;
- botão de **Resetar torneio** exclusivo da área do organizador;
- layout responsivo para desktop e celular;
- identidade visual esportiva em vermelho, branco e grafite.

## Área do organizador

O site é público para consulta, mas somente o organizador autenticado pode alterar o torneio.

Para entrar:

1. clique em **Área do organizador**;
2. informe a senha configurada em `ORGANIZER_PASSWORD`;
3. após a autenticação, uma sessão assinada é criada em cookie **HttpOnly**;
4. a sessão permanece válida por até **12 horas** neste navegador.

Com a sessão ativa, o organizador pode cadastrar jogadores, iniciar o torneio, registrar ou corrigir resultados e resetar o campeonato.

### Resetar o torneio

O botão **Resetar torneio** aparece somente para o organizador autenticado, na aba **Jogadores**.

Antes de executar o reset, o sistema exige confirmação. A ação remove:

- jogadores;
- partidas;
- resultados;
- estado de início do torneio.

A senha e a sessão do organizador não são apagadas.

## Persistência e segurança

Os dados são persistidos no **Supabase** por meio da API REST, acessada somente pelo backend do Next.js.

A tabela usa controle de versão para evitar sobrescritas concorrentes. Se duas alterações acontecerem ao mesmo tempo, a segunda é rejeitada e a interface solicita atualização.

A tabela `tournament_state` utiliza **Row Level Security (RLS)** e não possui políticas públicas. O acesso do servidor usa `SUPABASE_SECRET_KEY`, que deve permanecer somente no ambiente do backend.

A API também valida:

- sessão do organizador para alterações;
- origem da requisição;
- conteúdo JSON;
- tamanho da requisição;
- versão atual do torneio;
- regras de pontuação dos sets.

## Stack

- **Next.js 16**
- **React 19**
- **TypeScript**
- **Tailwind CSS 4**
- **shadcn / Radix UI**
- **Supabase**
- **Vercel**
- **pnpm**

## Variáveis de ambiente

Crie um arquivo `.env.local` para desenvolvimento ou configure as variáveis no projeto da Vercel.

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
ORGANIZER_PASSWORD=
```

Na Vercel, configure as três variáveis em **Preview** e **Production**.

> `SUPABASE_SECRET_KEY` e `ORGANIZER_PASSWORD` nunca devem ser enviados ao frontend ou versionados no GitHub.

O projeto também aceita `ORGANIZER_SETUP_HASH` apenas como compatibilidade com a configuração antiga. Para novas instalações, use `ORGANIZER_PASSWORD`.

## Configuração do Supabase

No **SQL Editor** do Supabase, execute o conteúdo de:

```text
supabase/tournament_state.sql
```

Ele cria a tabela principal e o registro inicial:

```sql
create table if not exists public.tournament_state (
  id integer primary key check (id = 1),
  data jsonb not null,
  version bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.tournament_state enable row level security;

insert into public.tournament_state (id, data, version)
values (
  1,
  '{"format":"knockout-8","players":[],"matches":[],"started":false}'::jsonb,
  0
)
on conflict (id) do nothing;
```

Não crie políticas públicas para essa tabela.

## Desenvolvimento local

Requisitos:

- **Node.js 22.13 ou superior**
- **pnpm 11**

Instalação:

```sh
pnpm install
```

Inicie o ambiente local:

```sh
pnpm dev
```

Build de produção:

```sh
pnpm build
pnpm start
```

Lint:

```sh
pnpm lint
```

## Publicação no Vercel

O projeto está conectado ao GitHub e usa integração automática com a Vercel.

- pushes em branches geram **Preview Deployments**;
- alterações integradas à `main` geram **Production Deployments**;
- o framework é detectado como **Next.js**;
- o build usa `pnpm build`.

Configuração atual em `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "pnpm build",
  "installCommand": "pnpm install --frozen-lockfile"
}
```

## Estrutura principal

```text
app/
  arena.tsx                  Interface principal do torneio
  api/tournament/route.ts    API de leitura e alterações

lib/
  organizer-auth.ts          Autenticação e sessão do organizador
  storage.ts                 Persistência no Supabase
  tournament.ts              Regras, chaveamento e classificação

supabase/
  tournament_state.sql       Estrutura inicial do banco

public/
  favicon.svg                Favicon do site
```

## Fluxo do torneio

1. O organizador cadastra os 8 jogadores.
2. O sistema sorteia os quatro confrontos das quartas.
3. Os resultados das quartas definem automaticamente os semifinalistas.
4. Os vencedores das semifinais avançam para a final.
5. Após o resultado da final, o campeão é destacado automaticamente.
6. Quando necessário, o organizador pode resetar o torneio e iniciar uma nova edição.

## Repositório

A branch principal de produção é:

```text
main
```

Para mudanças maiores de interface ou comportamento, prefira criar uma branch separada, validar no Preview da Vercel e só depois integrar à `main`.
