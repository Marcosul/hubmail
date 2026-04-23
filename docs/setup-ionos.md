# Setup e Implantacao: Stalwart Mail Server na IONOS VPS

Guia pratico para instalar, configurar e publicar um servidor de email com Stalwart em uma VPS da IONOS, usando os dados atuais do ambiente OpenSync.

## 1) Dados da VPS (extraidos de `opensync/apps/api/.env`)

- **IPv4 da VPS:** `216.250.124.232`
- **Usuario SSH:** `root`
- **Senha SSH atual:** `OpenSync369`
- **IONOS API Base URL:** `https://api.ionos.com/cloudapi/v6`
- **Datacenter ID:** `b98c1df6-3c32-448d-bec8-41f51af0ad48`
- **Server ID:** `ada78118-93ca-4a4e-8eee-138f1dfa9f64`
- **Server HREF:** `https://api.ionos.com/cloudapi/v6/datacenters/d361a03d-9486-468a-b004-5cd44b17dbf7/servers/ada78118-93ca-4a4e-8eee-138f1dfa9f64`

> Recomendado: apos o primeiro acesso, trocar a senha root e/ou criar usuario administrativo com `sudo`.

## 2) Pre-requisitos para implantacao

Antes de instalar o Stalwart:

1. Defina o hostname publico do servidor de email (exemplo: `mail.hubmail.to`).
2. Aponte o DNS A/AAAA do hostname para `216.250.124.232`.
3. Libere portas no firewall da IONOS e no SO da VPS.
4. Garanta que a VPS tenha saida HTTPS para baixar o instalador.

## 3) Portas obrigatorias (IONOS + sistema operacional)

| Servico | Porta | Protocolo | Uso |
| :--- | :---: | :---: | :--- |
| SMTP | 25 | TCP | Recebimento/entrega entre servidores |
| SMTP Submission | 587 | TCP | Envio autenticado por clientes (STARTTLS) |
| SMTPS | 465 | TCP | Envio autenticado com TLS implicito |
| IMAP | 143 | TCP | Leitura de email (STARTTLS) |
| IMAPS | 993 | TCP | Leitura de email com TLS implicito |
| HTTP | 80 | TCP | Validacoes e desafios ACME (quando aplicavel) |
| HTTPS | 443 | TCP | Admin final e trafego seguro |
| Admin bootstrap | 8080 | TCP | Setup inicial do Stalwart |

## 4) Acesso SSH na VPS

```bash
ssh root@216.250.124.232
```

Se solicitado, use a senha `OpenSync369`.

## 5) Instalacao do Stalwart no Linux

### 5.1 Baixar script oficial

```bash
curl --proto '=https' --tlsv1.2 -sSf https://get.stalw.art/install.sh -o install.sh
```

### 5.2 Executar instalacao

```bash
sudo sh install.sh
```

O instalador cria:

- Binario: `/usr/local/bin/stalwart`
- Config: `/etc/stalwart/config.json`
- Variaveis de ambiente: `/etc/stalwart/stalwart.env`
- Dados: `/var/lib/stalwart/`
- Logs: `/var/log/stalwart/`
- Servico `stalwart` (systemd/SysV/launchd conforme plataforma)

## 6) Recuperar credenciais temporarias (bootstrap)

Logo apos a primeira inicializacao, o Stalwart imprime usuario/senha temporarios de admin no log.

No Linux com systemd:

```bash
sudo journalctl -u stalwart -n 200 | grep -A8 'bootstrap mode'
```

Procure por:

- `username: admin`
- `password: <senha-temporaria-16-caracteres>`

## 7) Setup inicial via Web UI

Acesse:

```text
http://216.250.124.232:8080/admin
```

Entre com:

- Usuario: `admin`
- Senha: a senha temporaria recuperada no passo anterior

No wizard, preencha no minimo:

1. **Server hostname:** ex. `mail.hubmail.to`
2. **Default email domain:** `hubmail.to`
3. **Automatically obtain TLS certificate:** manter habilitado (recomendado)
4. **Generate email signing keys:** manter habilitado (DKIM)

As demais etapas podem iniciar com padrao recomendado (RocksDB e diretorio interno), ajustando depois conforme necessidade.

## 8) Reiniciar apos concluir wizard

No Linux com systemd:

```bash
sudo systemctl restart stalwart
```

Depois do restart, o admin migra para:

```text
https://<hostname-configurado>/admin
```

Exemplo:

```text
https://mail.hubmail.to/admin
```

## 9) DNS minimo para producao (por dominio)

Publique pelo menos:

- **`A` (ou `AAAA`)** para o **hostname do servidor** (ex.: `mail.hubmail.to` -> IPv4 da VPS).
- **`MX` na zona do dominio de correio** (ex.: nome `@` / raiz em `hubmail.to`) apontando para esse hostname (`mail.hubmail.to`). Sem este registo, servidores externos (Gmail, Outlook, etc.) respondem *sem respostas MX* e a mensagem **nem chega** ao Stalwart — o erro nao e do Stalwart, e do DNS.
- `TXT SPF`
- `TXT DKIM` (gerado pelo Stalwart)
- `TXT DMARC`

**Exemplo concreto (HubMail):** na zona `hubmail.to`, criar `A` para `mail` -> `216.250.124.232` e `MX` em `@` -> `mail.hubmail.to` (prioridade 10). Ver tambem `docs/credentials-config.md` secao 9.

Opcional e recomendado:

- `autoconfig`/`autodiscover`
- `MTA-STS` e `TLS-RPT`

## 10) Validacao pos-implantacao

Checklist rapido:

1. `sudo systemctl status stalwart` retorna servico ativo.
2. Login no `https://<hostname>/admin` funciona.
3. SMTP (25/587/465) responde externamente.
4. IMAP (143/993) responde externamente.
5. Envio e recebimento entre um email externo e uma caixa local funcionam.
6. SPF, DKIM e DMARC validam em ferramentas externas.

### 10.1 Onde **abrir / ler** mensagens (importante)

- **`https://mail.hubmail.to/admin`** — consola de **administracao** (operadores). Pode mostrar pastas e contagens ao gerir contas, mas **nao e um webmail** para ler o corpo do email como no Gmail.
- **`https://mail.hubmail.to/account`** — [Account Manager](https://stalw.art/docs/management/webui/account-manager): o utilizador altera palavra-passe, **app passwords** (para clientes IMAP), 2FA, etc. A doc oficial **nao** descreve leitor de inbox completo aqui.
- **Para ler e enviar correio no dia-a-dia:** use um **cliente de email** com **IMAP** (ou JMAP) contra `mail.hubmail.to`, por exemplo **Thunderbird**, **Outlook**, **Apple Mail** ou a app de correio do telemovel. Servidor de entrada: `mail.hubmail.to`, porta **993** (SSL) ou **143** (STARTTLS); SMTP: **587** (STARTTLS) ou **465** (SSL); utilizador = endereco completo (`admin@hubmail.to`) e a respetiva senha (ou *application password* se tiver 2FA).

## 11) Operacao e seguranca

- Altere/rotacione senha root da VPS.
- Considere desabilitar login root por senha apos hardening.
- Mantenha snapshots/backups de `/etc/stalwart` e `/var/lib/stalwart`.
- Monitore logs (`journalctl -u stalwart -f`).
- Atualize o Stalwart periodicamente conforme releases oficiais.

## 12) Automacao: Webhook no recebimento (por dominio)

Para acionar automacoes quando uma mensagem chega ao servidor, configure **um WebHook por dominio** apontando para o endpoint da API que processa o evento.

1. **Onde criar no Stalwart:** `Settings` -> `Telemetry` -> `Webhooks` (veja a referencia de objeto `WebHook` na documentacao de Webhooks do Stalwart: [Stalwart Webhooks](https://stalw.art/docs/telemetry/webhooks/)).
2. **Eventos a incluir (recebimento/ingestao):** o Stalwart nao suporta wildcard de evento; liste explicitamente os tipos desejados. Minimo sugerido para `eventsPolicy: include`:

   - `message-ingest.ham`
   - `message-ingest.spam`
   - `message-ingest.duplicate`
   - `message-ingest.error`
   - `message-ingest.imap-append`
   - `message-ingest.jmap-append`
   - `message-ingest.fts-index`

   Lista de tipos de evento: [Stalwart Events](https://stalw.art/docs/telemetry/events#event-types)

3. **Como fica “um webhook por dominio” na pratica:** o Stalwart envia o POST para a URL que voce configurou; **nao depende** de existir `webhook@dominio` como mailbox. A separacao por dominio e feita de duas formas (use as duas):

   - **URL unica por dominio:** ex. `https://<sua-api>/webhooks/mail/ingest/<dominio-sld>`
   - **Header fixo** (opcional, ajuda a depurar): ex. `X-Hub-Domain: <dominio>`

4. **Seguranca (obrigatorio em producao):** configure `signatureKey` (HMAC) e valide a assinatura no endpoint (header `X-Signature`, conforme a doc de Webhooks: [Stalwart Webhooks](https://stalw.art/docs/telemetry/webhooks/)).

5. **Payload e roteamento:** o corpo traz `events[]` com `type` e `data`. O payload pode incluir chaves padrao como `domain` / `to` / `messageId` (veja a secao de chaves em [Stalwart Events](https://stalw.art/docs/telemetry/events#event-types)). O seu worker deve:
   - validar assinatura
   - filtrar pelo dominio (campo de dados e/ou header/URL)
   - executar a automacao (publicar em fila, chamar n8n, etc.)

6. **Operacao e confiabilidade:** mantenha `lossy` alinhado com a criticidade. Se o endpoint cair, eventos sem `lossy` podem acumular; defina `timeout`, `throttle` e `discardAfter` de forma conservadora.

> Referencia complementar: anuncio de Webhooks/MTA Hooks (contexto geral) em [Stalwart blog: Webhooks and MTA Hooks](https://stalw.art/blog/webhooks)

## 13) HTTPS / TLS: ACME nativo do Stalwart vs Certbot

Se o navegador mostra **"Nao seguro"** mesmo em `https://mail.hubmail.to/...`, normalmente significa que o servidor ainda esta servindo um **certificado autoassinado de bootstrap** ate o Let's Encrypt emitir o certificado final.

### 13.1 Caminho recomendado (sem Certbot)

O Stalwart ja possui cliente **ACME** integrado. A configuracao correta fica em:

- `Settings` -> `TLS` -> `ACME Providers` (objeto `AcmeProvider`): [Stalwart ACME configuration](https://stalw.art/docs/server/tls/acme/configuration)
- `Settings` -> `TLS` -> `Certificates` (objeto `Certificate` para certificados manuais/importados): [Stalwart Certificates](https://stalw.art/docs/server/tls/certificates/)

Checklist para o Let's Encrypt funcionar com o desafio padrao **TLS-ALPN-01**:

1. **DNS publico** do `mail.hubmail.to` apontando para a VPS (A/AAAA).
2. **Porta 443** acessivel publicamente (sem outro servico ocupando 443 na mesma maquina).
3. **Sem proxy na frente** interceptando o ALPN ate o Stalwart (proxy errado quebra o desafio).
4. Aguardar alguns minutos e recarregar; enquanto isso o navegador pode mostrar aviso de certificado autoassinado (comportamento descrito no fluxo de setup do Stalwart: [Stalwart Linux/MacOS Install](https://stalw.art/docs/install/platform/linux/)).

Se voce nao pode expor 443 para validacao publica, troque o provider para **DNS-01** (integracao com provedor DNS ou registro TXT manual), conforme a doc de ACME: [Stalwart ACME configuration](https://stalw.art/docs/server/tls/acme/configuration).

### 13.3 Certificado LE emitido mas o navegador ainda mostra autoassinado

Pode ocorrer quando existem varios objetos `Certificate` (tentativas anteriores) e o **fallback SNI** ainda aponta para o certificado de bootstrap. Nesse caso:

1. Liste certificados e confira qual tem **issuer Let's Encrypt** e SAN correto:

   ```bash
   stalwart-cli --url https://mail.hubmail.to -k --user admin@SEU_DOMINIO --password '***' query certificate --json
   ```

2. Defina o certificado padrao no singleton `SystemSettings` (substitua `<id>` pelo `id` do objeto `Certificate` desejado):

   ```bash
   stalwart-cli --url https://mail.hubmail.to -k --user admin@SEU_DOMINIO --password '***' \
     update systemsettings singleton --json '{"defaultCertificateId":"<id>"}'
   sudo systemctl restart stalwart
   ```

3. Valide na VPS (deve mostrar **Let's Encrypt**, nao `rcgen`):

   ```bash
   echo | openssl s_client -connect mail.hubmail.to:443 -servername mail.hubmail.to 2>/dev/null \
     | openssl x509 -noout -subject -issuer -dates
   ```

### 13.2 Quando usar Certbot (opcional)

Use Certbot **somente** se voce decidir emitir certificados **fora** do Stalwart e importar como `Certificate` (PEM) no painel, seguindo: [Stalwart Certificates](https://stalw.art/docs/server/tls/certificates/).

Cuidado com conflito de porta:

- `certbot certonly --standalone` tenta ocupar **80/443** e **conflita** com o Stalwart escutando em **443**.
- Modo seguro com Stalwart rodando: **`certbot certonly --dns-01 ...`** (nao precisa bind em 443) e depois importar `fullchain.pem` + `privkey.pem`.

Apos rotacionar arquivos no disco, use o fluxo de **reload de certificados** descrito na doc (sem necessidade de parar o servidor inteiro): [Stalwart Certificates](https://stalw.art/docs/server/tls/certificates/)

### 13.4 Chrome mostra "Nao seguro" mas o Let's Encrypt ja esta na 443

No Chrome, **"Nao seguro" em vermelho costuma significar HTTP (sem TLS)** ou **TLS invalido** (nome errado, certificado expirado, CA nao confiavel, etc.). O endereco na barra **nao mostra** `https://` mesmo quando a pagina e HTTPS; por isso confira o detalhe do aviso (clique no texto ou no icone).

Checklist rapido:

1. **Admin na porta 8080 e HTTP:** o Stalwart continua escutando `*:8080` com **HTTP puro** (sem criptografia). Qualquer URL como `http://mail.hubmail.to:8080/admin/...` aparecera como **Nao seguro** — isso e esperado. Use **somente** o admin em **HTTPS na 443**:

   `https://mail.hubmail.to/admin/login`

2. **Marcador ou historico com `http://`:** apague o marcador antigo e crie um novo apontando explicitamente para `https://mail.hubmail.to/...`.

3. **Acesso pelo IP:** `https://216.250.124.232/...` pode gerar **nome nao confere com o certificado** (SAN e `mail.hubmail.to`). Use sempre o **hostname** publico.

4. **Confirmar na maquina (Linux/macOS):** se o servidor publico estiver correto, o emissor deve ser Let's Encrypt:

   ```bash
   curl -vI 'https://mail.hubmail.to/admin/login' 2>&1 | sed -n '/Server certificate:/,/SSL certificate verify/p'
   ```

5. **Antivirus / proxy corporativo / SSL inspection:** alguns ambientes substituem o certificado; o Chrome acusa erro ou "Nao seguro". Teste em **rede outra** ou **aba anonima** sem extensoes.

6. **Hardening opcional (VPS):** se ninguem precisa do admin pela internet na 8080, restrinja a 8080 no firewall para **apenas seu IP** ou **localhost**, para nao haver tentacao de usar HTTP por engano.

## Referencia oficial

- [Stalwart Linux/MacOS Install](https://stalw.art/docs/install/platform/linux/)
