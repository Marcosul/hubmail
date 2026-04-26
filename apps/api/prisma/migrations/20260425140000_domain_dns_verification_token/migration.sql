-- Token único para TXT em _hubmail.<domínio> (verificação HubMail + alinhamento com Stalwart na VPS)
ALTER TABLE "domains" ADD COLUMN "dns_verification_token" VARCHAR(128);
