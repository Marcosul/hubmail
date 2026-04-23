# HubMail — Descrição do Projeto

## Visão

O **HubMail** é uma plataforma para **gerenciar e operar e-mail corporativo** com foco em confiabilidade (entrega, reputação, DNS/TLS) e em **capacidades modernas de automação**. A proposta é começar gerenciando os domínios dos produtos internos para validação operacional e, em seguida, abrir para o mercado como um serviço pago.

## Problema

Operar e-mail com qualidade é caro em tempo e risco: DNS incorreto, TLS/ACME, SPF/DKIM/DMARC, reputação, suporte a clientes, monitoramento e incidentes. Ao mesmo tempo, times de produto precisam de **integrações confiáveis** (“quando chega um e-mail, dispara um fluxo”) e cada vez mais de **automação assistida por IA** com governança.

## Solução

O HubMail oferece:

- **Operação gerenciada** de e-mail para domínios de clientes (e inicialmente para os domínios internos de validação).
- **Automação por eventos** baseada em notificações HTTP (webhooks) disparadas pelo servidor de e-mail quando ocorre ingestão/processamento de mensagens, permitindo integrar CRMs, ERPs, filas, n8n, etc.
- **Serviços para agentes de IA** como camada opcional: triagem, extração estruturada, classificação, roteamento e rascunhos — sempre com trilhas de auditoria, limites e políticas por organização.

## Público-alvo

### Fase 1 — Validação interna

Organizações e produtos do ecossistema atual, com domínios já planejados para onboarding no HubMail.

### Fase 2 — Mercado (expansão)

PMEs, SaaS, agências e operações que precisam de e-mail confiável **e** integrações modernas (automação/IA), com onboarding self-serve e limites anti-abuso.

## Diferenciais

- **Gestão completa do ciclo de e-mail**: DNS, TLS, políticas, contas, aliases, observabilidade e suporte operacional.
- **Automação nativa**: ingestão de mensagem vira **evento** consumível por sistemas externos (webhooks), reduzindo polling e acoplamento.
- **IA como produto**, não “feature solta”: filas, políticas de retenção, limites de custo, auditoria e modos com aprovação humana quando necessário.

## Escopo técnico (alto nível)

- **Mail core**: Stalwart como servidor de e-mail (SMTP/IMAP/JMAP, armazenamento, TLS/ACME).
- **Control plane (HubMail)**: API e painel para tenants/workspaces, domínios, usuários, billing, segredos e configuração de webhooks.
- **Workers**: consumo idempotente de eventos, normalização, retries/DLQ, conectores.
- **Camada IA (opcional)**: pipelines assíncronos com políticas fortes de privacidade e custo.

## Modelo de negócio (diretriz)

- **Assinatura** por organização/workspace.
- **Cobrança por capacidade** (caixas, armazenamento, volume de mensagens e picos).
- **Add-ons**: automação avançada (webhooks throughput/SLA) e pacotes de **créditos de IA**.

## Fases de execução

1. **Validação interna**: estabilizar operação, reputação, observabilidade e onboarding repetível.
2. **Beta privado**: poucos clientes convidados, suporte alto contato, hardening de billing e limites.
3. **GA**: self-serve, políticas anti-abuso, tiers claros e suporte escalável.

## Princípios de produto

- **Confiabilidade primeiro**: sem entrega estável, automação e IA não escalam.
- **Segurança por padrão**: segredos fora do git, rotação, assinatura de webhooks, princípio do menor privilégio.
- **Idempotência**: automações devem tolerar reentrega e duplicidade de eventos.
- **Transparência**: status de DNS/TLS, filas, falhas de webhook e métricas de entrega visíveis ao cliente.

## Documentação relacionada (repositório)

- `hubmail/docs/setup-ionos.md`: implantação do servidor (IONOS + Stalwart) e notas de TLS/ACME.
- `hubmail/docs/domains-emails.md`: inventário de domínios e padrao de contas/aliases/webhooks por dominio.
- `hubmail/docs/credentials-config.md`: credenciais e parametros do setup (operacional; nao versionar segredos a longo prazo).

## Referências externas (mail core)

- [Stalwart Linux / macOS Install](https://stalw.art/docs/install/platform/linux/)
- [Stalwart Webhooks](https://stalw.art/docs/telemetry/webhooks/)
- [Stalwart Events](https://stalw.art/docs/telemetry/events#event-types)

## Próximos passos sugeridos

1. Fechar **MVP de produto**: workspace, dominio, contas, DNS checklist, status de saude.
2. Definir **SLAs internos** de webhook (retries, DLQ, idempotência) e um painel mínimo de falhas.
3. Definir **política de dados** para IA (retencao, opt-in, logs, exportação/exclusão).
4. Preparar **beta privado**: contrato/AUP, precificação inicial e limites anti-abuso.
