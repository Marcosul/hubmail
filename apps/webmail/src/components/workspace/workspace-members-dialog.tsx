"use client";

import { useMemo, useState } from "react";
import {
  AtSign,
  Check,
  Copy,
  Globe,
  Inbox,
  Layers,
  Loader2,
  Mail,
  MailPlus,
  Send,
  Shield,
  Trash2,
  UserMinus,
  Users,
  Webhook,
  X,
} from "lucide-react";
import {
  useCancelInvite,
  useCreateInvite,
  useRemoveMember,
  useResendInvite,
  useUpdateMemberRole,
  useWorkspaceInvites,
  useWorkspaceMembers,
} from "@/hooks/use-workspace";
import { useDomains } from "@/hooks/use-domains";
import { useMailboxes, useMailGroups } from "@/hooks/use-mail";
import { useWebhookEndpoints } from "@/hooks/use-webhooks";
import type {
  InviteScope,
  MembershipRole,
  ResourceRole,
  WorkspaceInviteSummary,
  WorkspaceMemberSummary,
  WorkspaceSummary,
} from "@hubmail/types";

type Props = {
  workspace: WorkspaceSummary;
  onClose: () => void;
};

type TabKey = "members" | "pending" | "invite";

const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Admin",
  MEMBER: "Membro",
};

const RESOURCE_ROLE_LABELS: Record<ResourceRole, string> = {
  ADMIN: "Admin",
  USER: "Utilizador",
};

const SCOPE_OPTIONS: {
  key: InviteScope;
  title: string;
  description: string;
  icon: typeof Users;
}[] = [
  {
    key: "WORKSPACE",
    title: "Workspace inteiro",
    description: "Acesso completo a todos os recursos",
    icon: Layers,
  },
  {
    key: "DOMAIN",
    title: "Domínio",
    description: "Inclui contas e webhooks do domínio",
    icon: Globe,
  },
  {
    key: "MAILBOX",
    title: "Conta de email",
    description: "Acesso a uma única caixa",
    icon: Inbox,
  },
  {
    key: "MAIL_GROUP",
    title: "Grupo de email",
    description: "Acesso a um grupo (alias multi-conta)",
    icon: Users,
  },
  {
    key: "WEBHOOK",
    title: "Webhook",
    description: "Permite ver/editar um webhook",
    icon: Webhook,
  },
];

function MembershipRoleBadge({ role }: { role: MembershipRole }) {
  const colors: Record<MembershipRole, string> = {
    OWNER: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
    ADMIN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    MEMBER: "bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colors[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

function ScopeBadge({
  scope,
  resourceLabel,
}: {
  scope: InviteScope;
  resourceLabel: string | null;
}) {
  const opt = SCOPE_OPTIONS.find((o) => o.key === scope);
  const Icon = opt?.icon ?? Layers;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
      <Icon className="size-3" />
      {opt?.title ?? scope}
      {resourceLabel ? (
        <span className="text-neutral-400 dark:text-neutral-500">· {resourceLabel}</span>
      ) : null}
    </span>
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar link de convite"
      className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs font-medium text-neutral-600 hover:border-indigo-300 hover:text-indigo-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:text-indigo-400"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copiado" : "Copiar link"}
    </button>
  );
}

function MemberRow({
  member,
  canManage,
  currentUserId,
  workspaceId,
}: {
  member: WorkspaceMemberSummary;
  canManage: boolean;
  currentUserId?: string;
  workspaceId: string;
}) {
  const updateRole = useUpdateMemberRole(workspaceId);
  const remove = useRemoveMember(workspaceId);
  const isOwner = member.role === "OWNER";
  const isSelf = member.userId === currentUserId;

  return (
    <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
      <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-semibold text-indigo-700 dark:from-indigo-900/40 dark:to-violet-900/40 dark:text-indigo-300">
        {(member.email ?? "?")[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
          {member.email ?? member.userId}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {isSelf ? "Você" : "Membro do workspace"}
        </p>
      </div>

      {canManage && !isOwner && !isSelf ? (
        <select
          value={member.role}
          disabled={updateRole.isPending}
          onChange={(e) =>
            updateRole.mutate({ membershipId: member.id, role: e.target.value })
          }
          className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
        >
          {(["ADMIN", "MEMBER"] as MembershipRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      ) : (
        <MembershipRoleBadge role={member.role} />
      )}

      {canManage && !isOwner && !isSelf && (
        <button
          onClick={() => remove.mutate(member.id)}
          disabled={remove.isPending}
          title="Remover membro"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
        >
          {remove.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <UserMinus className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}

function InviteRow({
  invite,
  workspaceId,
}: {
  invite: WorkspaceInviteSummary;
  workspaceId: string;
}) {
  const cancel = useCancelInvite(workspaceId);
  const resend = useResendInvite(workspaceId);

  const roleLabel =
    invite.scope === "WORKSPACE"
      ? ROLE_LABELS[invite.role]
      : invite.resourceRole
        ? RESOURCE_ROLE_LABELS[invite.resourceRole]
        : "—";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-3 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 bg-neutral-50 text-xs font-medium text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800">
          <AtSign className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
            {invite.email}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ScopeBadge scope={invite.scope} resourceLabel={invite.resource?.label ?? null} />
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              {roleLabel}
            </span>
          </div>
        </div>

        <button
          onClick={() => resend.mutate(invite.id)}
          disabled={resend.isPending}
          title="Reenviar convite"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 dark:hover:bg-indigo-900/20"
        >
          {resend.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
        </button>

        <button
          onClick={() => cancel.mutate(invite.id)}
          disabled={cancel.isPending}
          title="Cancelar convite"
          className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-900/20"
        >
          {cancel.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
        <span className="truncate text-xs text-neutral-500 dark:text-neutral-400">
          {invite.acceptUrl}
        </span>
        <CopyLinkButton url={invite.acceptUrl} />
      </div>
    </div>
  );
}

function InviteForm({
  workspaceId,
  onSent,
}: {
  workspaceId: string;
  onSent: () => void;
}) {
  const createInvite = useCreateInvite(workspaceId);
  const { data: domains } = useDomains();
  const { data: mailboxes } = useMailboxes();
  const { data: mailGroups } = useMailGroups();
  const { data: webhooks } = useWebhookEndpoints();

  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<InviteScope>("WORKSPACE");
  const [resourceId, setResourceId] = useState<string>("");
  const [workspaceRole, setWorkspaceRole] = useState<MembershipRole>("MEMBER");
  const [resourceRole, setResourceRole] = useState<ResourceRole>("USER");
  const [message, setMessage] = useState("");

  const resourceOptions = useMemo(() => {
    if (scope === "DOMAIN") return (domains ?? []).map((d) => ({ id: d.id, label: d.name }));
    if (scope === "MAILBOX")
      return (mailboxes ?? []).map((m) => ({ id: m.id, label: m.address }));
    if (scope === "MAIL_GROUP")
      return (mailGroups ?? []).map((g) => ({
        id: g.id,
        label: g.name || g.address,
      }));
    if (scope === "WEBHOOK")
      return (webhooks ?? []).map((w) => ({
        id: w.id,
        label: w.description || w.url,
      }));
    return [];
  }, [scope, domains, mailboxes, mailGroups, webhooks]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    const payload: Parameters<typeof createInvite.mutate>[0] = {
      email: email.trim(),
      scope,
      message: message || undefined,
    };
    if (scope === "WORKSPACE") {
      payload.role = workspaceRole;
    } else {
      if (!resourceId) return;
      payload.resourceRole = resourceRole;
      if (scope === "DOMAIN") payload.domainId = resourceId;
      if (scope === "MAILBOX") payload.mailboxId = resourceId;
      if (scope === "MAIL_GROUP") payload.mailGroupId = resourceId;
      if (scope === "WEBHOOK") payload.webhookId = resourceId;
    }

    createInvite.mutate(payload, {
      onSuccess: () => {
        setEmail("");
        setMessage("");
        setResourceId("");
        onSent();
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Email do convidado
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colega@empresa.com"
          required
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-900/40"
        />
      </div>

      {/* Escopo */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          O que está a partilhar?
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SCOPE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const selected = scope === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => {
                  setScope(opt.key);
                  setResourceId("");
                }}
                className={`flex items-start gap-2.5 rounded-lg border p-3 text-left transition ${
                  selected
                    ? "border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-900/20"
                    : "border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-600"
                }`}
              >
                <Icon
                  className={`mt-0.5 size-4 flex-shrink-0 ${
                    selected ? "text-indigo-600 dark:text-indigo-400" : "text-neutral-400"
                  }`}
                />
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      selected
                        ? "text-indigo-900 dark:text-indigo-200"
                        : "text-neutral-800 dark:text-neutral-200"
                    }`}
                  >
                    {opt.title}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {opt.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recurso */}
      {scope !== "WORKSPACE" && (
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Qual recurso?
          </label>
          <select
            value={resourceId}
            onChange={(e) => setResourceId(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
          >
            <option value="">Selecionar…</option>
            {resourceOptions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
          {resourceOptions.length === 0 && (
            <p className="mt-1 text-xs text-neutral-400">
              Nenhum recurso disponível neste escopo.
            </p>
          )}
        </div>
      )}

      {/* Role */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Função
        </label>
        {scope === "WORKSPACE" ? (
          <div className="grid grid-cols-2 gap-2">
            {(["ADMIN", "MEMBER"] as MembershipRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setWorkspaceRole(r)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  workspaceRole === r
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                {ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {(["ADMIN", "USER"] as ResourceRole[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResourceRole(r)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  resourceRole === r
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-300"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
                }`}
              >
                {RESOURCE_ROLE_LABELS[r]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Mensagem */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Mensagem (opcional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Adicione uma nota ao convite…"
          className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:focus:ring-indigo-900/40"
        />
      </div>

      {createInvite.isError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/20 dark:text-red-400">
          {createInvite.error.message}
        </p>
      )}

      <button
        type="submit"
        disabled={
          createInvite.isPending ||
          !email.trim() ||
          (scope !== "WORKSPACE" && !resourceId)
        }
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-50"
      >
        {createInvite.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Enviar convite
      </button>
    </form>
  );
}

export function WorkspaceMembersDialog({ workspace, onClose }: Props) {
  const isAdmin = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const [tab, setTab] = useState<TabKey>("members");

  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers(workspace.id);
  const { data: invites, isLoading: loadingInvites } = useWorkspaceInvites(
    isAdmin ? workspace.id : undefined,
  );

  const tabs: { key: TabKey; label: string; count?: number; icon: typeof Users }[] = [
    { key: "members", label: "Membros", count: members?.length, icon: Users },
    ...(isAdmin
      ? ([
          { key: "pending", label: "Pendentes", count: invites?.length, icon: Mail },
          { key: "invite", label: "Convidar", icon: MailPlus },
        ] as const)
      : []),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-neutral-200 px-6 pb-4 pt-5 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  <Shield className="size-4" />
                </div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Compartilhar acesso
                </h2>
              </div>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                Workspace <span className="font-medium">{workspace.name}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-white text-indigo-700 shadow-sm dark:bg-neutral-900 dark:text-indigo-400"
                      : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {t.label}
                  {typeof t.count === "number" && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        active
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                          : "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "members" && (
            <>
              {loadingMembers ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-neutral-400" />
                </div>
              ) : !members || members.length === 0 ? (
                <p className="py-10 text-center text-sm text-neutral-400">
                  Nenhum membro ainda.
                </p>
              ) : (
                <div className="-mx-3 divide-y divide-neutral-100 dark:divide-neutral-800">
                  {members.map((m) => (
                    <MemberRow
                      key={m.id}
                      member={m}
                      canManage={isAdmin}
                      workspaceId={workspace.id}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "pending" && isAdmin && (
            <>
              {loadingInvites ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="size-5 animate-spin text-neutral-400" />
                </div>
              ) : !invites || invites.length === 0 ? (
                <div className="py-10 text-center">
                  <Mail className="mx-auto size-8 text-neutral-300 dark:text-neutral-600" />
                  <p className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                    Nenhum convite pendente.
                  </p>
                  <button
                    onClick={() => setTab("invite")}
                    className="mt-3 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Enviar um convite →
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} workspaceId={workspace.id} />
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "invite" && isAdmin && (
            <InviteForm workspaceId={workspace.id} onSent={() => setTab("pending")} />
          )}
        </div>
      </div>
    </div>
  );
}
