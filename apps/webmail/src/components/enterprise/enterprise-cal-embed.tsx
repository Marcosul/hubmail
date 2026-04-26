/**
 * Embed Cal.com (ou URL compatível com iframe).
 * Defina `NEXT_PUBLIC_ENTERPRISE_CAL_EMBED_URL` com o URL do tipo de evento (ex. `https://cal.com/equipa/enterprise?embed=true`).
 * @see https://cal.com/docs/core-features/embed
 */
function normalizeEmbedUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  try {
    const u = new URL(trimmed);
    if ((u.hostname === "cal.com" || u.hostname.endsWith(".cal.com")) && !u.searchParams.has("embed")) {
      u.searchParams.set("embed", "true");
    }
    return u.toString();
  } catch {
    return trimmed;
  }
}

export function EnterpriseCalEmbed() {
  const raw = process.env.NEXT_PUBLIC_ENTERPRISE_CAL_EMBED_URL ?? "";
  const src = normalizeEmbedUrl(raw);
  const contactEmail = process.env.NEXT_PUBLIC_ENTERPRISE_CONTACT_EMAIL ?? "";

  if (!src) {
    return (
      <div className="flex min-h-[520px] flex-col justify-center rounded-xl border border-dashed border-white/[0.15] bg-[#0c0c0c] px-6 py-10 text-center sm:px-8">
        <p className="text-lg font-semibold text-white">Agendamento por Cal.com</p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          Configure a variável de ambiente{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs text-neutral-300">
            NEXT_PUBLIC_ENTERPRISE_CAL_EMBED_URL
          </code>{" "}
          com o URL de embed do seu evento Cal.com para o widget aparecer aqui.
        </p>
        {contactEmail ? (
          <a
            href={`mailto:${contactEmail}?subject=HubMail%20Enterprise`}
            className="mx-auto mt-8 inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-sm font-semibold text-neutral-950 transition-colors hover:bg-neutral-100"
          >
            Escrever por email
          </a>
        ) : (
          <p className="mt-6 text-xs text-neutral-600">
            Opcional: defina também <code className="font-mono">NEXT_PUBLIC_ENTERPRISE_CONTACT_EMAIL</code> para um
            botão de contacto.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.1] bg-[#0a0a0a] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <iframe
        title="Agendar chamada — HubMail Enterprise"
        src={src}
        className="min-h-[min(720px,85vh)] w-full border-0 sm:min-h-[680px]"
        allow="camera; microphone; fullscreen; payment"
        loading="lazy"
      />
    </div>
  );
}
