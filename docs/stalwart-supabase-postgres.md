# Stalwart (VPS) — armazenamento no PostgreSQL do Supabase

Guia operacional para ligar o Stalwart na **VPS** ao **mesmo projeto Supabase** que a API HubMail usa, com credenciais obtidas a partir de [apps/api/.env](../apps/api/.env) (não comitar segredos; não colar passwords neste repositório).

**Âmbito actual:** o servidor de teste teve tráfego mínimo, mas a migracao aplicada em producao foi feita com **export/import** entre backends para preservar objetos (dominios, listeners, certificados e conta admin). Para migracoes futuras, siga o mesmo padrao: [Stalwart — visão geral de backends](https://stalw.art/docs/storage/backends/overview).

## 1) Fonte de credenciais no repositório

| Variável | Uso |
| --- | --- |
| `DIRECT_URL` | Ligação directa ao Postgres (`db.<ref>.supabase.co:5432`), quando houver rota de rede disponivel na VPS. |
| `DATABASE_URL` | Pooler Prisma; tipicamente **não** adequado sozinho para o Stalwart se for URL do pooler (6543) em modo incompatível com conexões longas. |
| `STORAGE_POSTGRES_URL_NON_POOLING` | Alias opcional; mesmo papel que o direct, se seguir a convenção do [scripts/vercel-push-production-env.cjs](../scripts/vercel-push-production-env.cjs). |

Detalhe das variáveis: [apps/api/.env.example](../apps/api/.env.example).

## 2) Mapeamento `DIRECT_URL` → campos do Stalwart (PostgreSQL)

O `DIRECT_URL` tem o formato de URL PostgreSQL, por exemplo:

`postgresql://USER:PASSWORD@HOST:PORT/postgres?schema=public&...`

| Campo Stalwart (variante `PostgreSql`) | Origem |
| --- | --- |
| **host** | Componente *host* do URL (ex.: `db.xxxxx.supabase.co`). |
| **port** | Componente *port* (típico `5432`). Se omitido, assumir 5432. |
| **database** | Nome do path (ex.: `postgres` no Supabase). |
| **authUsername** / utilizador | `USER` do URL (decodificar *percent-encoding* se existir). |
| **authSecret** | `PASSWORD` do URL (decodificar; preferir ficheiro local ou *secret* no Stalwart, não o URL em claro no git). |
| **useTls** | **Ativado** para Supabase (ligação *TLS*; ver [PostgreSQL backend](https://stalw.art/docs/storage/backends/postgresql/)). |
| `options` (opcional) | Parâmetros *query* adicionais que o *driver* aceitar (ex.: `sslmode`); seguir a doc da tua versão. |

Não use o URL de **importação** de segredos no repositório: copie os valores de forma controlada no servidor (consola, variável de ambiente local a `/etc/stalwart/stalwart.env`, etc.).

## 3) Ficheiros e comandos na VPS (referência)

| Item | Caminho / comando típico |
| --- | --- |
| Configuração | `/etc/stalwart/config.json` (ou o caminho real da instalação) |
| Ambiente | `/etc/stalwart/stalwart.env` |
| Binário / CLI | `/usr/local/bin/stalwart` e `stalwart-cli` |
| Dados locais (legado RocksDB) | `/var/lib/stalwart/` — pode ser limpo após testes, se deixou de usar RocksDB e não precisa de backup local |
| Serviço | `sudo systemctl stop stalwart` / `start` / `status` |
| Logs | `sudo journalctl -u stalwart -n 200 --no-pager` |

Ajuste exacto da UI: **Settings → Storage →** criar o *store* `PostgreSql` e em **Settings** associar o *Data store*, *Blob store*, *Search store* e *in-memory* ao mesmo destino, se quiser o equivalente a “use data store” com um único Postgres. Referência: [backends](https://stalw.art/docs/storage/backends/overview).

## 4) Rede e Supabase

- A VPS precisa de **egresso TCP** para o host:porta do Supabase (normalmente 5432).
- Se tiver *Network restrictions* no painel do Supabase, autorisar o **IP público** da VPS.
- Se o direct URL incluir `sslmode=require` (ou equivalente), alinhe com a secção **TLS** do objecto de *store* no Stalwart.

## 5) Prisma (HubMail) e Stalwart no mesmo projecto

A API [apps/api](../apps/api) usa o mesmo *database* `postgres` para tabelas Prisma (ex. `public.profiles`). O Stalwart cria o seu próprio conjunto de tabelas. Conflito de nomes improvável; no futuro, um *schema* dedicado e `search_path` pode ser avaliado via `options` do conector, se necessário.

## 6) Fluxo recomendado (com export/import entre backends)

1. Parar o servico: `sudo systemctl stop stalwart`.
2. Exportar o backend atual: `stalwart --config=/etc/stalwart/config.json --export /root/stalwart-export.bin`.
3. Atualizar `/etc/stalwart/config.json` para variante `PostgreSql` (host/porta/user/password vindos de segredo local).
4. Importar para o novo backend: `stalwart --config=/etc/stalwart/config.json --import /root/stalwart-export.bin`.
5. Iniciar o servico: `sudo systemctl start stalwart`.
6. Verificar no `journalctl` e no `stalwart-cli get datastore --json` que o backend ativo e `PostgreSql`.

**Nota de conectividade real (VPS atual):**
- `db.<project-ref>.supabase.co:5432` estava sem rota a partir da VPS.
- `aws-1-us-east-1.pooler.supabase.com:5432` estava acessivel.
- Config final aplicada: `host=aws-1-us-east-1.pooler.supabase.com`, `port=5432`, `useTls=false`, `options=sslmode=require`.

## 6a) Erro "Temporary server failure" no login (checklist)

Quando o Web UI mostrar erro generico ao autenticar, validar em ordem:

1. **Redirect URI insegura:** eventos `auth.error` com `Redirect URI must be HTTPS` indicam login por `http://...` em vez de `https://...`.
2. **Store indisponivel:** erros `store.postgresql-error` / TLS handshake / credenciais.
3. **Conta ausente no diretorio interno:** confirmar `get account <id>` e dominio associado.

No ambiente atual, o item 1 ocorreu em acessos por URL HTTP e foi corrigido ao padronizar acesso HTTPS.

## 7) Full-text search (FTS) no PostgreSQL

O Stalwart documenta [limitações de tamanho do índice full-text do PostgreSQL](https://stalw.art/docs/storage/backends/postgresql/) (truncagem de corpo/attachments para o `tsvector`). Para cargas muito exigentes em pesquisa, avalie outro *backend* de procura, conforme a doc *FTS*.

## 8) Verificação rapida pós-mudança

- `sudo systemctl status stalwart`
- `sudo journalctl -u stalwart -n 100 --no-pager` (erros de autenticacao ou SSL)
- SMTP 25/587/465 e IMAP 143/993 conforme [setup-ionos](setup-ionos.md) secção 9–10
- [Documentação Stalwart — PostgreSQL](https://stalw.art/docs/storage/backends/postgresql/)
