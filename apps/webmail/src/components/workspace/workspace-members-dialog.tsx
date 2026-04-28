"use client";

import { useState } from "react";
import {
  Loader2,
  Mail,
  MailPlus,
  Shield,
  Trash2,
  UserMinus,
  Users,
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
import type {
  MembershipRole,
  WorkspaceInviteSummary,
  WorkspaceMemberSummary,
  WorkspaceSummary,
} from "@hubmail/types";

type Props = {
  workspace: WorkspaceSummary;
  onClose: () => void;
};

const ROLE_LABELS: Record<MembershipRole, string> = {
  OWNER: "Proprietário",
  ADMIN: "Admin",
  MEMBER: "Membro",
};

function RoleBadge({ role }: { role: MembershipRole }) {
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
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
        {(member.email ?? "?")[0].toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {member.email ?? member.userId}
        </p>
      </div>

      {canManage && !isOwner && !isSelf ? (
        <select
          value={member.role}
          disabled={updateRole.isPending}
          onChange={(e) =>
            updateRole.mutate({ membershipId: member.id, role: e.target.value })
          }
          className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
        >
          {(["ADMIN", "MEMBER"] as MembershipRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
      ) : (
        <RoleBadge role={member.role} />
      )}

      {canManage && !isOwner && !isSelf && (
        <button
          onClick={() => remove.mutate(member.id)}
          disabled={remove.isPending}
          title="Remover membro"
          className="text-neutral-400 hover:text-red-500 disabled:opacity-50"
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

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-neutral-300 bg-neutral-100 text-xs text-neutral-400 dark:border-neutral-600 dark:bg-neutral-800">
        ?
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">
          {invite.email}
        </p>
        <p className="text-xs text-neutral-400">Pendente · {ROLE_LABELS[invite.role]}</p>
      </div>

      <button
        onClick={() => resend.mutate(invite.id)}
        disabled={resend.isPending}
        title="Reenviar convite"
        className="text-neutral-400 hover:text-indigo-500 disabled:opacity-50"
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
        className="text-neutral-400 hover:text-red-500 disabled:opacity-50"
      >
        {cancel.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trash2 className="size-4" />
        )}
      </button>
    </div>
  );
}

export function WorkspaceMembersDialog({ workspace, onClose }: Props) {
  const isAdmin = workspace.role === "OWNER" || workspace.role === "ADMIN";
  const { data: members, isLoading: loadingMembers } = useWorkspaceMembers(workspace.id);
  const { data: invites, isLoading: loadingInvites } = useWorkspaceInvites(
    isAdmin ? workspace.id : undefined,
  );
  const createInvite = useCreateInvite(workspace.id);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<MembershipRole>("MEMBER");
  const [inviteMessage, setInviteMessage] = useState("");

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    createInvite.mutate(
      { email: inviteEmail.trim(), role: inviteRole, message: inviteMessage || undefined },
      {
        onSuccess: () => {
          setInviteEmail("");
          setInviteMessage("");
        },
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col rounded-xl border border-neutral-200 bg-white shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-700">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-indigo-500" />
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
              Membros · {workspace.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Members list */}
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Membros ({members?.length ?? 0})
          </p>
          {loadingMembers ? (
            <div className="flex justify-center py-4">
              <Loader2 className="size-5 animate-spin text-neutral-400" />
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {members?.map((m) => (
                <MemberRow
                  key={m.id}
                  member={m}
                  canManage={isAdmin}
                  workspaceId={workspace.id}
                />
              ))}
            </div>
          )}

          {/* Pending invites */}
          {isAdmin && (
            <>
              <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Convites pendentes ({invites?.length ?? 0})
              </p>
              {loadingInvites ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-neutral-400" />
                </div>
              ) : invites?.length === 0 ? (
                <p className="py-2 text-sm text-neutral-400">Nenhum convite pendente.</p>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {invites?.map((inv) => (
                    <InviteRow key={inv.id} invite={inv} workspaceId={workspace.id} />
                  ))}
                </div>
              )}

              {/* Invite form */}
              <form onSubmit={handleInvite} className="mt-5 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  Convidar por email
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="colega@empresa.com"
                    required
                    className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as MembershipRole)}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                  >
                    <option value="MEMBER">Membro</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <input
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="Mensagem opcional..."
                  maxLength={500}
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                />
                {createInvite.isError && (
                  <p className="text-xs text-red-500">{createInvite.error.message}</p>
                )}
                {createInvite.isSuccess && (
                  <p className="text-xs text-emerald-600">Convite enviado com sucesso.</p>
                )}
                <button
                  type="submit"
                  disabled={createInvite.isPending || !inviteEmail.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {createInvite.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MailPlus className="size-4" />
                  )}
                  Enviar convite
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
