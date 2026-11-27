import type { Executor } from '../db/client';
import { auditLog } from '../db/schema';

/**
 * Appends to the audit log. Call it inside the same transaction as the change
 * it records, so the two commit or roll back together.
 */
export async function recordAudit(
  exec: Executor,
  entry: {
    /** Null for system actions (jobs, expiry). */
    actorId: string | null;
    action: string;
    entity: string;
    entityId: string;
    data?: Record<string, unknown>;
  },
): Promise<void> {
  await exec.insert(auditLog).values(entry);
}
