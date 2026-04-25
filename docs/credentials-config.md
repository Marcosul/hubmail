# HubMail - Credenciais e Configuracoes de Implantacao

Documento operacional com as credenciais atuais e os parametros de configuracao usados no setup inicial do Stalwart na VPS da IONOS.

## 1) Servidor (IONOS VPS)

- **IP publico:** `216.250.124.232`
- **SSH user:** `root`
- **SSH password:** `vault://infra/ionos/root-password`
- **API base (IONOS):** `https://api.ionos.com/cloudapi/v6`
- **Datacenter ID:** `b98c1df6-3c32-448d-bec8-41f51af0ad48`
- **Server ID:** `ada78118-93ca-4a4e-8eee-138f1dfa9f64`

## 2) Stalwart (bootstrap - historico)

- **Admin URL (bootstrap):** `http://216.250.124.232:8080/admin`
- **Usuario temporario:** `admin`
- **Senha temporaria (bootstrap):** `vault://mail/hubmail.to/stalwart-bootstrap-admin` (usada so ate concluir o wizard)

> Apos o wizard finalizar, a conta de administrador definitiva (abaixo) substitui o bootstrap.

## 2a) Stalwart (administrador definitivo - pos-wizard)

Credenciais exibidas na tela "Setup complete" (senha nao e recuperavel depois; guarde com seguranca).

- **Email do administrador:** `admin@hubmail.to`
- **Senha do administrador:** `IZkXuz8OkspObVlQ`
- **Admin URL (final):** `https://mail.hubmail.to/admin` (aplique `systemctl restart stalwart` se ainda nao fez, conforme o fluxo do Stalwart)

### HTTPS (Let's Encrypt) — estado atual

Apos o ACME concluir a ordem para `mail.hubmail.to`, foi necessario definir **`SystemSettings.defaultCertificateId`** para o `Certificate` emitido pelo Let's Encrypt (o navegador deixou de mostrar o certificado autoassinado de bootstrap). Detalhe e comandos de verificacao: `docs/setup-ionos.md` secao **13.3**.

**Importante:** o admin em **`http://mail.hubmail.to:8080`** e HTTP sem TLS — o Chrome mostra **"Nao seguro"** sempre. O acesso seguro e **`https://mail.hubmail.to/admin`** (porta **443**). Se a barra ainda assustar, veja o checklist em **13.4** do mesmo guia.

## 2b) Stalwart Enterprise (trial) — aplicado no servidor

Portal de licenciamento (referencia): `https://license.stalw.art/license/4815`

- **Emitido para:** `hubmail.to`
- **Licencas (mailboxes):** `25`
- **Validade:** portal mostra **23 Abr 2026** a **23 Mai 2026**; a chave em binario carrega `validFrom` / `validTo` em UTC (~18 Abr 2026 – ~28 Mai 2026), alinhado com o evento `server.licensing` nos logs.
- **License Key (correta — copiar uma linha):** `vault://mail/hubmail.to/stalwart-enterprise-license`
- **API Key (auto-renewal):** `vault://mail/hubmail.to/stalwart-enterprise-api-key`

> A chave antiga no repo tinha um segmento Base64 errado (`AAhV...` em vez de `aHVibWFpbC50b...` = `hubmail.to`), o que invalidava a licenca offline e fazia falhar o Enterprise ate corrigir.

### Como foi aplicado (VPS)

1. Instalado `stalwart-cli` e link simbolico em `/usr/local/bin/stalwart-cli`.
2. Atualizado o singleton `Enterprise` via CLI (`update enterprise`) com `licenseKey` + `apiKey` como `SecretKeyOptional/Value` (doc: [Enterprise object](https://stalw.art/docs/ref/object/enterprise)).
3. Executado `systemctl restart stalwart` apos aplicar a licenca.

### Pos-aplicacao (Web UI)

Apos mudancas de licenca, a documentacao recomenda **logout/login** no Webadmin para refletir recursos Enterprise na sessao: [Enterprise license](https://stalw.art/docs/server/enterprise).

## 3) Wizard - Step 1 (Server Identity)

Preencher com:

- **Server Hostname:** `mail.hubmail.to`
- **Default Email Domain:** `hubmail.to`
- **Automatically Obtain TLS Certificate:** `ON`
- **Generate Email Signing Keys (DKIM):** `ON`

## 4) Wizard - Step 2 (Storage) — PostgreSQL (Supabase)

A configuracao em producao alinha o Stalwart ao **mesmo projecto Supabase** que a API HubMail. Nao colocar credenciais em texto puro neste documento; usar sempre referencias `vault://...`. Guia completo, mapeamento de campos e checklist na VPS: [stalwart-supabase-postgres.md](stalwart-supabase-postgres.md).

**No Webadmin (ou equivalente na tua versao):**

- **Main Data Storage:** `PostgreSQL` (variante `PostgreSql` / *store* PostgreSQL)
- **host / port / database / user / password:** preencher a partir de `STORAGE_POSTGRES_URL_NON_POOLING` (sem colar segredos no git)
- **TLS:** alinhar com a conectividade real do endpoint escolhido (na implantacao atual: `useTls=false` + `options=sslmode=require` para o host pooler `aws-1-us-east-1.pooler.supabase.com:5432`)
- **Attachment & File Storage:** apontar para a **mesma** loja PostgreSQL (equivalente a *Use data store* com backend remoto)
- **Full-Text Search Index:** idem, mesma loja, salvo se optar por outro *backend* de procura
- **Cache & Temporary Data:** idem, ou conforme a doc da versao (single backend simplificado: tudo no mesmo Postgres)

**Historico (setup inicial com RocksDB em disco local):** em implantacoes antigas o wizard recomendava RocksDB com path em `/var/lib/stalwart/data`. Essa fase deixou de ser o alvo; pode-se remover o antigo dado em disco apos validacao, se nao for necessario arquivo local.

- **Thread pool / blob tuning** (RocksDB): nao aplicavel ao *store* remoto; deixe defaults do objecto PostgreSQL na doc da versao.

## 5) Wizard - Step 3 (Account Directory)

- **Directory Type:** `Use the Internal Directory`

## 6) Wizard - Step 4 (Logging)

- **Log destination:** `Log File` (VPS com disco persistente)
- **Path:** `/var/log/stalwart/`
- **Prefix:** `stalwart`
- **Rotate frequency:** `Daily`
- **Use ANSI colors:** `ON`
- **Multiline entries:** `OFF`
- **Enable this tracer:** `ON`
- **Logging level:** `Info`
- **Lossy mode:** `OFF`
- **Filtering mode:** `Exclude the specified events`
- **Events:** vazio (nenhum evento selecionado)

## 7) Wizard - Step 5 (DNS Management)

- **DNS server type:** `Manual DNS Server Management`

## 8) URLs finais esperadas

- **Admin bootstrap (antes do restart final):** `http://216.250.124.232:8080/admin`
- **Admin final (apos setup/restart):** `https://mail.hubmail.to/admin`

## 8a) Pos-migracao Supabase (estado aplicado em 2026-04-25)

- O `DataStore` do Stalwart foi migrado de `RocksDb` para `PostgreSql` com **export/import** offline (`stalwart --export` + `stalwart --import`) para manter os objetos de configuracao.
- O endpoint externo de login deve usar **HTTPS** (`https://mail.hubmail.to/...`). Tentativas em HTTP com `redirect_uri` nao segura retornam erro de autenticacao (`Redirect URI must be HTTPS`).
- A conta principal continua `admin@hubmail.to` (login com email completo, nao apenas `admin`).
- No HubMail (Supabase/Prisma), a mailbox principal `admin@hubmail.to` deve existir no workspace do utilizador `marcosul@gmail.com`.

## 9) DNS minimo para o dominio principal (`hubmail.to`)

Sem isto, o **recebimento** falha: o Gmail mostra *dominio nao encontrado* / *MX lookup ... had no relevant answers* — o dominio existe na raiz DNS, mas **nao ha registo MX** (nem A no apex), portanto ninguem sabe que o servidor de correio e a tua VPS.

Publicar na **zona DNS de `hubmail.to`** (onde o dominio esta registado — IONOS, Cloudflare, etc.):

| Tipo | Nome / host | Valor | Prioridade / TTL |
| :--- | :--- | :--- | :--- |
| **A** | `mail` (ou `mail.hubmail.to`) | `216.250.124.232` | default |
| **MX** | `@` ou `hubmail.to` (raiz da zona) | `mail.hubmail.to` | prioridade **10** (ou 0) |

Depois (recomendado para nao cair em spam):

- **TXT** SPF (ex.: `v=spf1 mx a:mail.hubmail.to ~all` — ajustar a politica final com a doc do Stalwart)
- **TXT** DKIM (copiar do Stalwart por dominio)
- **TXT** DMARC (ex.: `_dmarc.hubmail.to`)

**Verificacao** (quando propagar, alguns minutos a horas):

```bash
dig +short MX hubmail.to
dig +short A mail.hubmail.to
```

O primeiro deve devolver algo como `10 mail.hubmail.to.` e o segundo `216.250.124.232`.

> Estado verificado em 2026-04-23: `mail.hubmail.to` ja resolvia para a VPS; faltava **MX na raiz `hubmail.to`** no DNS publico — e exactamente o que o bounce do Gmail descreveu.

## 10) Comandos uteis (operacao)

```bash
sudo systemctl status stalwart
sudo systemctl restart stalwart
sudo journalctl -u stalwart -n 200 --no-pager
sudo journalctl -u stalwart -f

# Stalwart CLI (gestao via JMAP) — exemplo
stalwart-cli --url https://mail.hubmail.to -k --user admin@hubmail.to --password '***' get enterprise --json
```

## 11) Seguranca (acao imediata recomendada)

1. Trocar senha root da VPS.
2. Remover credenciais sensiveis deste arquivo apos registrar no cofre.
3. Manter segredos no vault (nao versionar secrets em texto puro).
