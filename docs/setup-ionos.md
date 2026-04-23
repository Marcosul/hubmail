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

- `A`/`AAAA` para `mail.hubmail.to`
- `MX` apontando para `mail.hubmail.to`
- `TXT SPF`
- `TXT DKIM` (gerado pelo Stalwart)
- `TXT DMARC`

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

## Referencia oficial

- [Stalwart Linux/MacOS Install](https://stalw.art/docs/install/platform/linux/)
