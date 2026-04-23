# Plano de Criacao de Dominios e Emails

Documento operacional para facilitar a criacao das caixas no Stalwart apos a instalacao.

## 1) Convencao padrao de usuarios por dominio

Para cada dominio, criar inicialmente:

- `admin@<dominio>`: conta tecnica principal (administracao)
- `no-reply@<dominio>`: automacoes e disparos sistêmicos
- `contato@<dominio>`: entrada comercial/geral
- `suporte@<dominio>` ou `support@<dominio>`: atendimento tecnico
- `financeiro@<dominio>` ou `finance@<dominio>`: cobranca/pagamentos

## 2) Politica de senha inicial

Para evitar senha em texto puro no git, usar placeholders e registrar senha real no cofre:

- **Formato de registro:** `vault://mail/<dominio>/<usuario>`
- **Senha inicial:** gerar aleatoria forte (min. 20 chars) por caixa
- **Troca obrigatoria:** apos primeiro login das contas pessoais

## 2b) Automação por e-mail: WebHook por domínio (recebimento)

O Stalwart notifica o backend via **WebHook** (HTTP POST) quando ocorre ingestao de mensagem. Para o HubMail, a regra e ter **1 WebHook ativo para cada domínio** apontando para a API, com HMAC (assinatura) guardado no cofre.

- **Onde no Stalwart:** `Settings` -> `Telemetry` -> `Webhooks` (veja: [Stalwart Webhooks](https://stalw.art/docs/telemetry/webhooks/))
- **Endpoint sugerido (padrao do projeto):** `https://<sua-api>/webhooks/mail/ingest/<dominio-sld-tld>`  
  - Exemplos: `.../ingest/hubmail.to`, `.../ingest/opensync.space`, `.../ingest/cotize.com.br`
- **HMAC/secret (nao comitar):** `vault://mail/<dominio>/webhook-signature` (o valor real entra no Stalwart em `signatureKey` no objeto WebHook)
- **Filtro no worker:** o endpoint deve filtrar por domínio usando **URL/headers** (fixos por WebHook) e validar o payload/assinatura; veja a lista de chaves de payload em [Stalwart Events](https://stalw.art/docs/telemetry/events#event-types)

Tabela (preencha as URLs reais e os IDs do WebHook após criar no painel):

| # | Domínio | WebHook (URL) | Chave (vault) |
| :---: | :--- | :--- | :--- |
| 1 | `hubmail.to` | `https://<sua-api>/webhooks/mail/ingest/hubmail.to` | `vault://mail/hubmail.to/webhook-signature` |
| 2 | `opensync.space` | `https://<sua-api>/webhooks/mail/ingest/opensync.space` | `vault://mail/opensync.space/webhook-signature` |
| 3 | `freespirit.app` | `https://<sua-api>/webhooks/mail/ingest/freespirit.app` | `vault://mail/freespirit.app/webhook-signature` |
| 4 | `supersquad.app` | `https://<sua-api>/webhooks/mail/ingest/supersquad.app` | `vault://mail/supersquad.app/webhook-signature` |
| 5 | `xbase.app` | `https://<sua-api>/webhooks/mail/ingest/xbase.app` | `vault://mail/xbase.app/webhook-signature` |
| 6 | `cotize.com.br` | `https://<sua-api>/webhooks/mail/ingest/cotize.com.br` | `vault://mail/cotize.com.br/webhook-signature` |
| 7 | `eudivino.com.br` | `https://<sua-api>/webhooks/mail/ingest/eudivino.com.br` | `vault://mail/eudivino.com.br/webhook-signature` |
| 8 | `omgam.com.br` | `https://<sua-api>/webhooks/mail/ingest/omgam.com.br` | `vault://mail/omgam.com.br/webhook-signature` |
| 9 | `quebreopadrao.com.br` | `https://<sua-api>/webhooks/mail/ingest/quebreopadrao.com.br` | `vault://mail/quebreopadrao.com.br/webhook-signature` |
| 10 | `ritualmatinal.com.br` | `https://<sua-api>/webhooks/mail/ingest/ritualmatinal.com.br` | `vault://mail/ritualmatinal.com.br/webhook-signature` |
| 11 | `visartjoias.com.br` | `https://<sua-api>/webhooks/mail/ingest/visartjoias.com.br` | `vault://mail/visartjoias.com.br/webhook-signature` |
| 12 | `vitamove.com.br` | `https://<sua-api>/webhooks/mail/ingest/vitamove.com.br` | `vault://mail/vitamove.com.br/webhook-signature` |
| 13 | `learnai.institute` | `https://<sua-api>/webhooks/mail/ingest/learnai.institute` | `vault://mail/learnai.institute/webhook-signature` |
| 14 | `mentesegura.institute` | `https://<sua-api>/webhooks/mail/ingest/mentesegura.institute` | `vault://mail/mentesegura.institute/webhook-signature` |
| 15 | `rejuver.clinic` | `https://<sua-api>/webhooks/mail/ingest/rejuver.clinic` | `vault://mail/rejuver.clinic/webhook-signature` |
| 16 | `virtusclaw.com` | `https://<sua-api>/webhooks/mail/ingest/virtusclaw.com` | `vault://mail/virtusclaw.com/webhook-signature` |
| 17 | `superclaw.bot` | `https://<sua-api>/webhooks/mail/ingest/superclaw.bot` | `vault://mail/superclaw.bot/webhook-signature` |
| 18 | `claudio.bot` | `https://<sua-api>/webhooks/mail/ingest/claudio.bot` | `vault://mail/claudio.bot/webhook-signature` |
| 19 | `funtask.pro` | `https://<sua-api>/webhooks/mail/ingest/funtask.pro` | `vault://mail/funtask.pro/webhook-signature` |
| 20 | `mensageiro.io` | `https://<sua-api>/webhooks/mail/ingest/mensageiro.io` | `vault://mail/mensageiro.io/webhook-signature` |
| 21 | `bilhaoascendente.com.br` | `https://<sua-api>/webhooks/mail/ingest/bilhaoascendente.com.br` | `vault://mail/bilhaoascendente.com.br/webhook-signature` |
| 22 | `ranchoaguaviva.com.br` | `https://<sua-api>/webhooks/mail/ingest/ranchoaguaviva.com.br` | `vault://mail/ranchoaguaviva.com.br/webhook-signature` |

> Passo a passo completo (eventos, HMAC, politica de fila): `hubmail/docs/setup-ionos.md` (secao 12).

## 3) Dominio principal detalhado

### `hubmail.to`

**DNS publico (receber email):** na zona `hubmail.to`, e obrigatorio um registo **MX** na raiz (`@`) para `mail.hubmail.to` e um **A** para `mail` -> IP da VPS (`216.250.124.232`). Sem MX, o Gmail devolve *DNS type mx lookup ... had no relevant answers*. Detalhe: `docs/credentials-config.md` secao 9.

| Usuario (mailbox) | Senha inicial | Alias | Dono principal | Observacao |
| :--- | :--- | :--- | :--- | :--- |
| `admin@hubmail.to` | `vault://mail/hubmail.to/admin` | `postmaster@hubmail.to` | TI | Conta tecnica |
| `no-reply@hubmail.to` | `vault://mail/hubmail.to/no-reply` | `noreply@hubmail.to` | Sistema | Envio automatico |
| `contato@hubmail.to` | `vault://mail/hubmail.to/contato` | `hello@hubmail.to` | Comercial | Entrada geral |
| `suporte@hubmail.to` | `vault://mail/hubmail.to/suporte` | `support@hubmail.to` | Suporte | Atendimento |
| `financeiro@hubmail.to` | `vault://mail/hubmail.to/financeiro` | `finance@hubmail.to` | Financeiro | Cobranca |
| `marco@hubmail.to` | `vault://mail/hubmail.to/marco` | `diretoria@hubmail.to` | Marco | Conta pessoal |

## 4) Matriz de criacao rapida (demais dominios)

> Nesta fase, os mesmos perfis de usuarios serao criados em todos os dominios abaixo para padronizar operacao.

| # | Dominio | Usuario principal | Senha (vault ref) | Alias principais |
| :---: | :--- | :--- | :--- | :--- |
| 1 | `opensync.space` | `admin@opensync.space` | `vault://mail/opensync.space/admin` | `postmaster@opensync.space`, `hello@opensync.space` |
| 2 | `freespirit.app` | `admin@freespirit.app` | `vault://mail/freespirit.app/admin` | `postmaster@freespirit.app`, `hello@freespirit.app` |
| 3 | `supersquad.app` | `admin@supersquad.app` | `vault://mail/supersquad.app/admin` | `postmaster@supersquad.app`, `hello@supersquad.app` |
| 4 | `xbase.app` | `admin@xbase.app` | `vault://mail/xbase.app/admin` | `postmaster@xbase.app`, `hello@xbase.app` |
| 5 | `cotize.com.br` | `admin@cotize.com.br` | `vault://mail/cotize.com.br/admin` | `postmaster@cotize.com.br`, `contato@cotize.com.br` |
| 6 | `eudivino.com.br` | `admin@eudivino.com.br` | `vault://mail/eudivino.com.br/admin` | `postmaster@eudivino.com.br`, `contato@eudivino.com.br` |
| 7 | `omgam.com.br` | `admin@omgam.com.br` | `vault://mail/omgam.com.br/admin` | `postmaster@omgam.com.br`, `contato@omgam.com.br` |
| 8 | `quebreopadrao.com.br` | `admin@quebreopadrao.com.br` | `vault://mail/quebreopadrao.com.br/admin` | `postmaster@quebreopadrao.com.br`, `contato@quebreopadrao.com.br` |
| 9 | `ritualmatinal.com.br` | `admin@ritualmatinal.com.br` | `vault://mail/ritualmatinal.com.br/admin` | `postmaster@ritualmatinal.com.br`, `contato@ritualmatinal.com.br` |
| 10 | `visartjoias.com.br` | `admin@visartjoias.com.br` | `vault://mail/visartjoias.com.br/admin` | `postmaster@visartjoias.com.br`, `contato@visartjoias.com.br` |
| 11 | `vitamove.com.br` | `admin@vitamove.com.br` | `vault://mail/vitamove.com.br/admin` | `postmaster@vitamove.com.br`, `contato@vitamove.com.br` |
| 12 | `learnai.institute` | `admin@learnai.institute` | `vault://mail/learnai.institute/admin` | `postmaster@learnai.institute`, `hello@learnai.institute` |
| 13 | `mentesegura.institute` | `admin@mentesegura.institute` | `vault://mail/mentesegura.institute/admin` | `postmaster@mentesegura.institute`, `hello@mentesegura.institute` |
| 14 | `rejuver.clinic` | `admin@rejuver.clinic` | `vault://mail/rejuver.clinic/admin` | `postmaster@rejuver.clinic`, `contato@rejuver.clinic` |
| 15 | `virtusclaw.com` | `admin@virtusclaw.com` | `vault://mail/virtusclaw.com/admin` | `postmaster@virtusclaw.com`, `hello@virtusclaw.com` |
| 16 | `superclaw.bot` | `admin@superclaw.bot` | `vault://mail/superclaw.bot/admin` | `postmaster@superclaw.bot`, `hello@superclaw.bot` |
| 17 | `claudio.bot` | `admin@claudio.bot` | `vault://mail/claudio.bot/admin` | `postmaster@claudio.bot`, `hello@claudio.bot` |
| 18 | `funtask.pro` | `admin@funtask.pro` | `vault://mail/funtask.pro/admin` | `postmaster@funtask.pro`, `hello@funtask.pro` |
| 19 | `mensageiro.io` | `admin@mensageiro.io` | `vault://mail/mensageiro.io/admin` | `postmaster@mensageiro.io`, `contato@mensageiro.io` |
| 20 | `bilhaoascendente.com.br` | `admin@bilhaoascendente.com.br` | `vault://mail/bilhaoascendente.com.br/admin` | `postmaster@bilhaoascendente.com.br`, `contato@bilhaoascendente.com.br` |
| 21 | `ranchoaguaviva.com.br` | `admin@ranchoaguaviva.com.br` | `vault://mail/ranchoaguaviva.com.br/admin` | `postmaster@ranchoaguaviva.com.br`, `contato@ranchoaguaviva.com.br` |

## 5) Pacote padrao por dominio (checklist de execucao)

Para cada dominio da matriz acima, criar este pacote minimo:

1. `admin@<dominio>`
2. `no-reply@<dominio>`
3. `contato@<dominio>` (ou `hello@<dominio>`)
4. `suporte@<dominio>` / `support@<dominio>`
5. `financeiro@<dominio>` / `finance@<dominio>`

Aliases recomendados:

- `postmaster@<dominio>` -> `admin@<dominio>`
- `noreply@<dominio>` -> `no-reply@<dominio>`
- `hello@<dominio>` -> `contato@<dominio>` (quando fizer sentido)
- `support@<dominio>` <-> `suporte@<dominio>` (equivalencia idioma)

## 6) Sequencia sugerida de criacao

1. `hubmail.to`
2. `gestaoderiquezas.com.br`
3. `opensync.space`
4. `freespirit.app`
5. `supersquad.app`
6. `xbase.app`
7. demais dominios da matriz
