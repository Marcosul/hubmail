# HubMail

Documentação do servidor em `docs/`. Aplicação **Webmail / consola** (Next.js) em `apps/webmail`.

## Webmail (Next.js)

```bash
cd hubmail
pnpm install
pnpm --filter @hubmail/webmail dev
```

Abre [http://localhost:3010](http://localhost:3010): landing **Home**; **Sign in** aceita qualquer email/password (sessão demo via cookie). Área logada: `/dashboard/overview` e restantes rotas sob `/dashboard/...`.

- Tema claro/escuro: botão no rodapé da sidebar.
- Estrutura alinhada ao monorepo `opensync` (pnpm + turbo); cliente HTTP reutilizável em `apps/webmail/src/api/rest/generic.ts`.

## Monorepo

Na raiz de `hubmail`, `pnpm dev` corre turbo (configurar filtros conforme fores adicionando `apps/api`, etc.).
