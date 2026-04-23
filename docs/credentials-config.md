# HubMail - Credenciais e Configuracoes de Implantacao

Documento operacional com as credenciais atuais e os parametros de configuracao usados no setup inicial do Stalwart na VPS da IONOS.

## 1) Servidor (IONOS VPS)

- **IP publico:** `216.250.124.232`
- **SSH user:** `root`
- **SSH password:** `OpenSync369`
- **API base (IONOS):** `https://api.ionos.com/cloudapi/v6`
- **Datacenter ID:** `b98c1df6-3c32-448d-bec8-41f51af0ad48`
- **Server ID:** `ada78118-93ca-4a4e-8eee-138f1dfa9f64`

## 2) Stalwart (bootstrap - historico)

- **Admin URL (bootstrap):** `http://216.250.124.232:8080/admin`
- **Usuario temporario:** `admin`
- **Senha temporaria (bootstrap):** `qPaGfevOPcNJXkZe` (usada so ate concluir o wizard)

> Apos o wizard finalizar, a conta de administrador definitiva (abaixo) substitui o bootstrap.

## 2a) Stalwart (administrador definitivo - pos-wizard)

Credenciais exibidas na tela "Setup complete" (senha nao e recuperavel depois; guarde com seguranca).

- **Email do administrador:** `admin@hubmail.to`
- **Senha do administrador:** `IZkXuz8OkspObVlQ`
- **Admin URL (final):** `https://mail.hubmail.to/admin` (aplique `systemctl restart stalwart` se ainda nao fez, conforme o fluxo do Stalwart)

## 3) Wizard - Step 1 (Server Identity)

Preencher com:

- **Server Hostname:** `mail.hubmail.to`
- **Default Email Domain:** `hubmail.to`
- **Automatically Obtain TLS Certificate:** `ON`
- **Generate Email Signing Keys (DKIM):** `ON`

## 4) Wizard - Step 2 (Storage)

Configuracao recomendada para inicio (single node):

- **Main Data Storage:** `RocksDB`
- **Path:** `/var/lib/stalwart/data`
- **Min blob size:** `16` `KB`
- **Write buffer size:** `128` `MB`
- **Thread pool size:** deixar vazio (default)
- **Attachment & File Storage:** `Use data store`
- **Full-Text Search Index:** `Use data store`
- **Cache & Temporary Data:** `Use data store`

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

## 9) DNS minimo para o dominio principal

- `A` -> `mail.hubmail.to` apontando para `216.250.124.232`
- `MX` -> `hubmail.to` apontando para `mail.hubmail.to`
- `TXT SPF`
- `TXT DKIM` (gerado no Stalwart)
- `TXT DMARC`

## 10) Comandos uteis (operacao)

```bash
sudo systemctl status stalwart
sudo systemctl restart stalwart
sudo journalctl -u stalwart -n 200 --no-pager
sudo journalctl -u stalwart -f
```

## 11) Seguranca (acao imediata recomendada)

1. Trocar senha root da VPS.
2. Remover credenciais sensiveis deste arquivo apos registrar no cofre.
3. Manter segredos no vault (nao versionar secrets em texto puro).
