"use client";

import { Loader2, Trash2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import {
  useCreateMailGroup,
  useDeleteMailGroup,
  useMailGroups,
  useMailboxes,
  useUpdateMailGroup,
} from "@/hooks/use-mail";
import { useI18n } from "@/i18n/client";

export default function MailGroupsPage() {
  const { messages } = useI18n();
  const copy = messages.inboxes;
  const { data: groups, isLoading } = useMailGroups();
  const { data: mailboxes } = useMailboxes();
  const createGroup = useCreateMailGroup();
  const updateGroup = useUpdateMailGroup();
  const deleteGroup = useDeleteMailGroup();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingToggle, setPendingToggle] = useState<string | null>(null);

  const mailboxOptions = useMemo(() => mailboxes ?? [], [mailboxes]);

  useEffect(() => {
    if (!showCreate) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowCreate(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [showCreate]);

  function toggleMember(id: string) {
    setMemberIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit() {
    setError(null);
    try {
      await createGroup.mutateAsync({
        address: address.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        memberIds,
      });
      setShowCreate(false);
      setName("");
      setAddress("");
      setDescription("");
      setMemberIds([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.groupCreateError);
    }
  }

  async function handleDelete(id: string, addr: string) {
    if (!window.confirm(copy.groupDeleteConfirm.replace("{address}", addr))) return;
    await deleteGroup.mutateAsync({ groupId: id });
  }

  async function handleToggleMember(groupId: string, currentIds: string[], mailboxId: string) {
    const next = currentIds.includes(mailboxId)
      ? currentIds.filter((x) => x !== mailboxId)
      : [...currentIds, mailboxId];
    const key = `${groupId}:${mailboxId}`;
    setPendingToggle(key);
    try {
      await updateGroup.mutateAsync({ groupId, memberIds: next });
    } finally {
      setPendingToggle(null);
    }
  }

  return (
    <DashboardShell
      title={copy.groupsTitle}
      subtitle={copy.groupsSubtitle}
      actions={
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-medium text-white hover:bg-neutral-800 sm:px-4 sm:text-sm dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          {copy.groupsCreate}
        </button>
      }
    >
      <div className="overflow-hidden rounded-lg border border-neutral-200 dark:border-hub-border">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-neutral-500">{copy.loading}</p>
        ) : !groups || groups.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">{copy.groupsEmpty}</p>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-hub-border">
            {groups.map((g) => {
              const memberIdsOfGroup = g.members.map((m) => m.id);
              return (
                <li key={g.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Users className="size-4 shrink-0 text-neutral-500" />
                        <span className="truncate font-mono text-sm text-neutral-900 dark:text-neutral-100">
                          {g.address}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-neutral-700 dark:text-neutral-300">{g.name}</p>
                      {g.description ? (
                        <p className="line-clamp-2 text-xs text-neutral-500">{g.description}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(g.id, g.address)}
                      className="shrink-0 rounded p-1 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      aria-label={copy.delete}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      {copy.groupMembers} ({g.members.length})
                    </p>
                    {mailboxOptions.length === 0 ? (
                      <p className="text-xs text-neutral-500">—</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {mailboxOptions.map((mb) => {
                          const checked = memberIdsOfGroup.includes(mb.id);
                          const isPending = pendingToggle === `${g.id}:${mb.id}`;
                          return (
                            <button
                              key={mb.id}
                              type="button"
                              onClick={() => handleToggleMember(g.id, memberIdsOfGroup, mb.id)}
                              disabled={updateGroup.isPending}
                              aria-pressed={checked}
                              aria-busy={isPending}
                              className={`inline-flex max-w-[260px] items-center gap-1 truncate rounded-md border px-2 py-1 text-xs font-mono transition-colors disabled:opacity-60 ${
                                checked
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-hub-border dark:text-neutral-400"
                              }`}
                            >
                              {isPending ? <Loader2 className="size-3 shrink-0 animate-spin" /> : null}
                              <span className="truncate">{mb.address}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showCreate ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-group-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCreate(false);
          }}
        >
          <div className="flex max-h-[100dvh] w-full max-w-lg flex-col rounded-t-xl border border-neutral-200 bg-white shadow-xl dark:border-hub-border dark:bg-[#111] sm:max-h-[90dvh] sm:rounded-xl">
            <div className="border-b border-neutral-200 px-4 py-3 dark:border-hub-border sm:px-5 sm:py-4">
              <h3 id="create-group-title" className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {copy.groupsCreate.replace(/^\+\s*/, "")}
              </h3>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {copy.groupName}
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {copy.groupAddress}
                </label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="time@dominio.com"
                  inputMode="email"
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {copy.groupDescription}
                </label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-hub-border dark:bg-[#171717] dark:text-neutral-100"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">
                  {copy.groupMembers}
                </p>
                <p className="mb-2 text-[11px] text-neutral-500">{copy.groupMembersHelp}</p>
                <div className="flex flex-wrap gap-1.5">
                  {mailboxOptions.length === 0 ? (
                    <span className="text-xs text-neutral-500">—</span>
                  ) : (
                    mailboxOptions.map((mb) => {
                      const checked = memberIds.includes(mb.id);
                      return (
                        <button
                          key={mb.id}
                          type="button"
                          onClick={() => toggleMember(mb.id)}
                          aria-pressed={checked}
                          className={`inline-flex max-w-[240px] items-center truncate rounded-md border px-2 py-1 text-xs font-mono transition-colors ${
                            checked
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-hub-border dark:text-neutral-400"
                          }`}
                        >
                          <span className="truncate">{mb.address}</span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-4 py-3 sm:px-5 dark:border-hub-border">
              <div className="order-2 w-full text-xs sm:order-1 sm:w-auto">
                {error ? <span className="text-red-600 dark:text-red-400">{error}</span> : null}
              </div>
              <div className="order-1 ml-auto flex shrink-0 gap-2 sm:order-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-hub-border dark:text-neutral-300 dark:hover:bg-white/5"
                >
                  {messages.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={!name.trim() || !address.trim() || createGroup.isPending}
                  className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-neutral-900"
                >
                  {createGroup.isPending ? copy.savingCredential : messages.common.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </DashboardShell>
  );
}
