# Stalwart (VPS) — armazenamento no PostgreSQL do Supabase

Guia operacional para ligar o Stalwart na **VPS** ao **mesmo projeto Supabase** que a API HubMail usa, com credenciais obtidas a partir de [apps/api/.env](../apps/api/.env) (não comitar segredos; não colar passwords neste repositório).

**Âmbito actual:** o servidor de teste teve tráfego mínimo. O fluxo descrito abaixo é **corte limpo** (reconfigurar o backend, sem import/export de dados a partir de RocksDB). Se no futuro precisar de migrar muita carga, consulte a documentação do Stalwart sobre **import/export** de base (dump binário entre backends): [Stalwart — visão geral de backends](https://stalw.art/docs/storage/backends/overview).

## 1) Fonte de credenciais no repositório

| Variável | Uso |
| --- | --- |
| `DIRECT_URL` | **Ligação directa** ao Postgres (geralmente `db.<ref>.supabase.co:5432`, sem PgBouncer em modo *transaction*). **É a que deve usar o Stalwart** — processo de longa duração, pool interno do Stalwart. |
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

## 6) Fluxo recomendado (sem export/import de dados)

1. Anotar a partir de `DIRECT_URL` (localmente, nunca no git) host, porto, `postgres`, utilizador, password.
2. Parar: `sudo systemctl stop stalwart`.
3. No Webadmin (ou na config, conforme a versão), definir a loja **PostgreSQL** e apontar **todas** as lojas necessárias a esse destino, **TLS** activo.
4. Iniciar: `sudo systemctl start stalwart`.
5. Verificar: `journalctl` sem erros de ligação ao Postgres; teste envio e recebimento; opcionalmente envio a uma caixa externa.
6. Após confirmação, opcionalmente arquivar ou apagar o directório de dados local RocksDB deixado em `/var/lib/stalwart/`.

**Nota:** depois de trocar o *storage* de raiz, pode ser necessário rever contas de administrador consoante a versão; em ambiente de teste isso costuma ser aceitável (ver plano de migracao do projecto).

## 7) Full-text search (FTS) no PostgreSQL

O Stalwart documenta [limitações de tamanho do índice full-text do PostgreSQL](https://stalw.art/docs/storage/backends/postgresql/) (truncagem de corpo/attachments para o `tsvector`). Para cargas muito exigentes em pesquisa, avalie outro *backend* de procura, conforme a doc *FTS*.

## 8) Verificação rapida pós-mudança

- `sudo systemctl status stalwart`
- `sudo journalctl -u stalwart -n 100 --no-pager` (erros de autenticacao ou SSL)
- SMTP 25/587/465 e IMAP 143/993 conforme [setup-ionos](setup-ionos.md) secção 9–10
- [Documentação Stalwart — PostgreSQL](https://stalw.art/docs/storage/backends/postgresql/)
