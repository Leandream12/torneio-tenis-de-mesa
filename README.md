# Arena Solar — Torneio de Tênis de Mesa

Site do torneio da SIPAT do Grupo Solar. Até 12 jogadores, dois grupos equilibrados, classificação e resultados em melhor de 3 sets.

## Como usar

1. Abra o site privado com sua conta ChatGPT.
2. Clique em **Área do organizador** e use a chave de ativação fornecida fora deste repositório. Essa etapa vincula permanentemente a organização ao seu identificador autenticado.
3. Cadastre de 4 a 12 nomes, um por linha.
4. Confirme o sorteio. O sistema distribui os jogadores e gera todas as partidas dos grupos.
5. Abra cada partida para registrar seus sets. A classificação atualiza automaticamente.
6. Ao concluir os grupos, gere as semifinais: 1º A × 2º B e 1º B × 2º A. A final é criada quando ambas terminarem.

Não há dados fictícios na base de produção. Os espectadores têm acesso de leitura quando o compartilhamento do site for habilitado; a primeira publicação é privada para o proprietário.

## Regulamento adotado

- Dois grupos; cada jogador enfrenta todos os outros do próprio grupo uma vez.
- Todas as partidas, inclusive semifinal e final, em melhor de 3 sets.
- Sets até 11, sempre com dois pontos de diferença; após 10–10, encerra na primeira vantagem de dois pontos.
- Classificação: vitórias, saldo de sets, saldo de pontos e, persistindo empate absoluto, prioridade da ordem do sorteio inicial. Este último critério é uma regra local do torneio, não uma alegação de regulamento oficial.
- Os dois primeiros de cada grupo se classificam.
- Para 12 inscritos: 30 jogos de grupos + 2 semifinais + 1 final = 33 partidas.
- Os grupos são bloqueados ao gerar semifinais. Uma semifinal pode ser corrigida antes do resultado da final; sua correção recria a final. Para corrigir após isso, primeiro remova o resultado da final.

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
node --experimental-strip-types --test tests/tournament.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Os testes verificam geração de confrontos para cada quantidade de 4 a 12 jogadores, regras de pontos e sets, classificação, progressão até o campeão, correção de dependências e validação de cadastro.

## Estrutura principal

- `app/arena.tsx`: interface, tabelas, filtros e formulários.
- `app/api/tournament/route.ts`: leitura e alterações protegidas.
- `lib/tournament.ts`: regras e classificação.
- `lib/storage.ts`: acesso ao banco.
- `db/schema.ts` e `drizzle/`: estrutura e migrações do banco.
- `.openai/hosting.json`: configuração lógica de publicação.

O GitHub guarda o código. Publicar alterações exige gerar e implantar uma nova versão; um push isolado no GitHub não altera automaticamente o site.
