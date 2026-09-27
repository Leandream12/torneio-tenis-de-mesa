# Arena Solar — Torneio de Tênis de Mesa

Site do torneio da SIPAT do Grupo Solar: **8 jogadores em mata-mata**, sem fase de grupos.

| Fase | Partidas | Formato | Vitória |
| --- | --- | --- | --- |
| Quartas de final | 4 | Set único | Vencer 1 set |
| Semifinais | 2 | Melhor de 3 sets | Vencer 2 sets |
| Final | 1 | Melhor de 3 sets | Vencer 2 sets |

**Total: 7 partidas. A final é uma única partida em melhor de 3 sets**, e não uma série de partidas.

## Como usar

1. Abra o site privado com sua conta ChatGPT.
2. Se ainda não ativou, clique em **Área do organizador** e use a chave fornecida fora deste repositório. Uma ativação existente continua válida.
3. Cadastre os 8 jogadores, um por linha. É possível salvar inscrições incompletas, mas o sorteio exige exatamente 8 nomes distintos.
4. Confirme **Sortear quartas e iniciar**. Cada jogador aparece em um dos quatro confrontos.
5. Abra cada partida e registre o placar. Nas quartas, o formulário exibe apenas um set; nas semifinais e na final, permite 2 ou 3 sets.
6. Os vencedores avançam automaticamente. QF 1 e QF 2 alimentam SF 1; QF 3 e QF 4 alimentam SF 2. Os vencedores das semifinais disputam a única final.

Sets até 11 pontos, sempre com dois pontos de vantagem. Após 10–10, o set termina na primeira vantagem de dois. A API rejeita sets extras depois que a partida já foi decidida.

## Classificação e correções

A tabela acompanha jogos, vitórias, derrotas, sets ganhos/perdidos e situação. O campeão termina em 1º, o vice em 2º; eliminados nas semifinais dividem o 3º lugar e eliminados nas quartas dividem o 5º. Sem disputa de terceiro lugar ou desempate artificial entre eliminados da mesma fase.

É possível corrigir pontos mantendo o vencedor. Para alterar o vencedor ou remover um resultado que já alimentou uma partida com placar, primeiro remova o resultado da partida dependente, começando pela final. Assim nenhum resultado é descartado silenciosamente.

## Compatibilidade com o formato anterior

Registros antigos de grupos são convertidos para um cadastro ainda não iniciado. Todos os nomes são mantidos, inclusive quando houver mais de 8; o organizador revisa e escolhe os 8 antes do novo sorteio. O documento anterior completo fica preservado em `previousFormat`, incluindo seus resultados. A conversão é salva na próxima alteração autorizada, não durante a leitura. A conta do organizador e a chave existente não mudam. Não há migração destrutiva do banco.

## Segurança e persistência

A API verifica a identidade ChatGPT no servidor e a compara com o único organizador salvo em D1. Ocultar botões não é a proteção de acesso. A ativação exige uma chave aleatória de 96 bits cujo SHA-256 é configurado como segredo de ambiente (`ORGANIZER_SETUP_HASH`). Nenhuma chave é incluída no código ou neste repositório. A ativação é atômica e não substitui um organizador existente.

Ações de escrita verificam a origem da requisição, o formato do corpo, a versão do registro e os placares. Atualizações concorrentes são rejeitadas para evitar sobrescrita silenciosa. Os dados ficam em D1, e não em localStorage. A tela consulta as atualizações a cada 20 segundos.

O proxy confiável do Sites fornece os cabeçalhos de identidade. **Não hospede este servidor diretamente na internet aceitando cabeçalhos de identidade enviados por visitantes.** Para outro provedor, adapte autenticação e banco antes de publicar. GitHub Pages não executa esta API nem seu banco.

## Desenvolvimento

Stack: React, TypeScript, Vinext/Vite, componentes Radix/shadcn, Cloudflare Workers e D1.

```sh
npm install
npm run db:generate # apenas se alterar o schema
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_windy_inertia.sql
npm run dev
```

O projeto inclui `pnpm-lock.yaml` para instalações reproduzíveis com pnpm. As migrações já geradas são versionadas em `drizzle/`; não reaplique manualmente uma migração já executada. A publicação Sites aplica as migrações em produção. O preview local não simula login: a área pública pode ser inspecionada, mas alterações autenticadas exigem o ambiente de identidade confiável.

```sh
node --experimental-strip-types --test tests/*.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Os testes verificam exatamente 8 inscritos, quartas em set único, semifinais e final MD3, sete partidas até o campeão, classificação, correção de dependências, preservação dos dados antigos e autorização da API.

## Estrutura principal

- `app/arena.tsx`: interface, tabelas, filtros e formulários.
- `app/api/tournament/route.ts`: leitura e alterações protegidas.
- `lib/tournament.ts`: regras e classificação.
- `lib/storage.ts`: acesso ao banco.
- `db/schema.ts` e `drizzle/`: estrutura e migrações do banco.
- `.openai/hosting.json`: configuração lógica de publicação.

O GitHub guarda o código. Publicar alterações exige gerar e implantar uma nova versão; um push isolado no GitHub não altera automaticamente o site.

## Publicação no Vercel

A branch `vercel-migration` roda como Next.js nativo no Vercel e usa o mesmo padrão simples do RespiraMente: Functions no Vercel acessando o Supabase REST diretamente.

### Variáveis obrigatórias

Configure no projeto do Vercel, em **Preview** e **Production**:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `ORGANIZER_PASSWORD`

A senha do organizador nunca é enviada para o frontend como configuração. Após o login, a API cria uma sessão assinada em cookie HttpOnly.

### Supabase

Execute o arquivo `supabase/tournament_state.sql` no SQL Editor do projeto Supabase antes do primeiro uso.

### Build

```sh
pnpm install --frozen-lockfile
pnpm build
```

Com a integração Git ativa, pushes em branches geram Preview Deployments e a `main` publica em Production.

<!-- preview redeploy after Vercel environment setup -->

<!-- preview redeploy after Supabase-Vercel integration -->

<!-- preview redeploy after SUPABASE_URL correction -->
