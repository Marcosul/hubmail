export type AgentStatus =
  | 'IDLE'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface AgentPolicy {
  requireApprovalForReply?: boolean;
  maxTokensPerRun?: number;
  allowedTools?: string[];
}

export interface AgentSummary {
  id: string;
  name: string;
  model: string;
  enabled: boolean;
  systemPrompt: string;
  tools: string[];
  policy: AgentPolicy;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AgentRunSummary {
  id: string;
  agentId: string;
  status: AgentStatus;
  tokensIn: number;
  tokensOut: number;
  costCents: number;
  startedAt?: string | Date | null;
  endedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface BudgetSummary {
  workspaceId: string;
  monthlyCents: number;
  usedCents: number;
  remainingCents: number;
  resetAt?: string | Date | null;
}
