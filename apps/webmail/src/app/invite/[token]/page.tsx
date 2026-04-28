"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Globe,
  Inbox,
  Layers,
  Loader2,
  LogIn,
  Mail,
  Users,
  Webhook,
} from "lucide-react";
import { useAcceptInvite, usePublicInvite } from "@/hooks/use-workspace";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { buildOAuthCallbackRedirectTo } from "@/lib/oauth-app-url";
import type { InviteScope, MembershipRole, ResourceRole } from "@hubmail/types";

const SCOPE_ICON: Record<InviteScope, typeof Layers> = {
  WORKSPACE: Layers,
  DOMAIN: Globe,
  MAILBOX: Inbox,
  MAIL_GROUP: Users,
  WEBHOOK: Webhook,
};

const ROLE_LABEL: Record<MembershipRole | ResourceRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Administrador",
  MEMBER: "Membro",
  USER: "Utilizador",
};

const SCOPE_LABEL: Record<InviteScope, string> = {
  WORKSPACE: "Workspace inteiro",
  DOMAIN: "Domínio",
  MAILBOX: "Conta de email",
  MAIL_GROUP: "Grupo de email",
  WEBHOOK: "Webhook",
};

export default function InviteLandingPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params?.token;
  const { data: invite, isLoading, error } = usePublicInvite(token);
  const acceptInvite = useAcceptInvite();
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured()) {
      setAuthChecked(true);
      return;
    }
    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setAuthedEmail(data.session?.user.email ?? null);
      } finally {
        if (mounted) setAuthChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function handleSignIn() {
    if (!isSupabaseConfigured()) {
      setSignInError("Supabase não configurado");
      return;
    }
    setSignInError(null);
    setSigningIn(true);
    try {
      const supabase = createSupabaseBrowserClient();
      // Volta para esta mesma página depois do login para auto-aceitar.
      document.cookie = `hubmail_oauth_next=${encodeURIComponent(`/invite/${token}`)};path=/;max-age=900;SameSite=Lax`;
      const redirectTo = buildOAuthCallbackRedirectTo();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo, queryParams: invite ? { login_hint: invite.email } : undefined },
      });
      if (error) setSignInError(error.message);
    } catch (e) {
      setSignInError(String(e));
    } finally {
      setSigningIn(false);
    }
  }

  async function handleAccept() {
    if (!token) return;
    try {
      const result = await acceptInvite.mutateAsync(token);
      router.push(`/dashboard?workspace=${result.workspace.slug}`);
    } catch {
      /* error mostrado no useAcceptInvite */
    }
  }

  // Loading
  if (isLoading || !authChecked) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-10 text-neutral-500">
          <Loader2 className="size-6 animate-spin" />
          <p className="text-sm">A carregar convite…</p>
        </div>
      </Shell>
    );
  }

  // Erro
  if (error || !invite) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="size-10 text-red-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Convite inválido
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Este convite não existe ou já não é válido.
          </p>
          <Link
            href="/"
            className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Voltar à página inicial
          </Link>
        </div>
      </Shell>
    );
  }

  // Status finais (já aceite / cancelado / expirado)
  if (invite.status !== "PENDING") {
    const map: Record<string, { title: string; desc: string }> = {
      ACCEPTED: {
        title: "Convite já aceite",
        desc: "Este convite já foi utilizado.",
      },
      CANCELLED: {
        title: "Convite cancelado",
        desc: "Quem o convidou cancelou este convite.",
      },
      EXPIRED: {
        title: "Convite expirado",
        desc: "Este convite expirou. Peça um novo a quem o convidou.",
      },
    };
    const m = map[invite.status] ?? map.EXPIRED;
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="size-10 text-amber-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {m.title}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{m.desc}</p>
        </div>
      </Shell>
    );
  }

  const ScopeIcon = SCOPE_ICON[invite.scope];
  const roleLabel =
    invite.scope === "WORKSPACE"
      ? ROLE_LABEL[invite.role]
      : invite.resourceRole
        ? ROLE_LABEL[invite.resourceRole]
        : "—";
  const isAuthed = !!authedEmail;
  const emailMismatch = isAuthed && authedEmail?.toLowerCase() !== invite.email.toLowerCase();

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex items-start gap-3">
          <div className="flex size-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            <ScopeIcon className="size-6" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {invite.inviterName ?? "Alguém"} convidou-o
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              para aceder a <strong>{invite.workspace.name}</strong>
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <dl className="space-y-2 text-sm">
            <Row label="Email convidado" value={invite.email} />
            <Row label="Tipo de acesso" value={SCOPE_LABEL[invite.scope]} />
            {invite.resource && <Row label="Recurso" value={invite.resource.label} />}
            <Row label="Função" value={roleLabel} />
          </dl>
          {invite.message && (
            <div className="mt-3 rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm italic text-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
              “{invite.message}”
            </div>
          )}
        </div>

        {emailMismatch && (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-300">
            <p>
              Está autenticado como <strong>{authedEmail}</strong>, mas este convite é para{" "}
              <strong>{invite.email}</strong>.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  setAuthedEmail(null);
                } catch {
                  /* ignore */
                }
              }}
              className="font-semibold underline underline-offset-2 hover:text-amber-900"
            >
              Terminar sessão e entrar com a conta correta
            </button>
          </div>
        )}

        {!isAuthed ? (
          <div className="space-y-3">
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              {signingIn ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              Entrar com Google e aceitar
            </button>
            <p className="text-center text-xs text-neutral-500">
              Vamos criar uma conta automaticamente se ainda não tem uma.
            </p>
            {signInError && (
              <p className="text-center text-xs text-red-500">{signInError}</p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={handleAccept}
              disabled={acceptInvite.isPending || emailMismatch}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              {acceptInvite.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              Aceitar convite
            </button>
            {acceptInvite.isError && (
              <p className="text-center text-xs text-red-500">
                {acceptInvite.error.message}
              </p>
            )}
          </div>
        )}

        <p className="text-center text-xs text-neutral-400">
          O convite expira em{" "}
          {new Date(invite.expiresAt).toLocaleDateString("pt-PT", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>
    </Shell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="truncate text-right font-medium text-neutral-900 dark:text-neutral-100">
        {value}
      </dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10 dark:bg-neutral-950">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        >
          <Mail className="size-4 text-indigo-600" /> HubMail
        </Link>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {children}
        </div>
      </div>
    </div>
  );
}
