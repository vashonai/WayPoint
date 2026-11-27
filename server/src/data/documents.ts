import { and, eq, gt, inArray, isNull, lte } from 'drizzle-orm';

import type { Db, Executor } from '../db/client';
import { driverDocuments, drivers, users, type DocumentFile } from '../db/schema';
import { getSignedDownloadUrl } from '../storage/r2';
import { recordAudit } from './audit';
import { getCountry } from './countries';

export type DriverDocument = typeof driverDocuments.$inferSelect;

export class DocumentError extends Error {}

/**
 * Registers an uploaded document for review.
 *
 * `type` must be a document slug the driver's country requires — the list
 * comes from that country's config, so a new market adds documents without a
 * schema change. Every file key must sit under the driver's own prefix
 * (`drivers/{driverId}/`), so one driver can't attach another's upload.
 */
export async function createDriverDocument(
  exec: Executor,
  {
    driverId,
    type,
    files,
    fields = {},
    expiresAt = null,
  }: {
    driverId: string;
    type: string;
    files: DocumentFile[];
    fields?: Record<string, string>;
    expiresAt?: Date | null;
  },
): Promise<DriverDocument> {
  const [owner] = await exec
    .select({ countryCode: users.countryCode })
    .from(drivers)
    .innerJoin(users, eq(users.id, drivers.userId))
    .where(eq(drivers.id, driverId));
  if (!owner) throw new DocumentError(`No driver ${driverId}`);
  if (!owner.countryCode) throw new DocumentError('Driver has no country set');

  const country = await getCountry(exec, owner.countryCode);
  const allowed = country?.config.driverDocuments.map((d) => d.slug) ?? [];
  if (!allowed.includes(type)) {
    throw new DocumentError(
      `${type} is not a ${owner.countryCode} driver document (${allowed.join(', ')})`,
    );
  }
  if (files.length === 0) throw new DocumentError('A document needs at least one file');
  const prefix = `drivers/${driverId}/`;
  const foreign = files.find((f) => !f.r2Key.startsWith(prefix));
  if (foreign) throw new DocumentError(`File key ${foreign.r2Key} is outside ${prefix}`);

  const [doc] = await exec
    .insert(driverDocuments)
    .values({ driverId, type, files, fields, expiresAt })
    .returning();
  if (!doc) throw new DocumentError('document insert returned nothing');
  return doc;
}

/** A reviewer's decision, written to the audit log in the same transaction. */
export async function reviewDocument(
  db: Db,
  {
    documentId,
    reviewerId,
    decision,
    reason = null,
    now = new Date(),
  }: {
    documentId: string;
    reviewerId: string;
    decision: 'approved' | 'rejected';
    reason?: string | null;
    now?: Date;
  },
): Promise<DriverDocument> {
  if (decision === 'rejected' && !reason) {
    throw new DocumentError('A rejection needs a reason the driver can act on');
  }
  return db.transaction(async (tx) => {
    const [doc] = await tx
      .update(driverDocuments)
      .set({ status: decision, reviewedBy: reviewerId, reviewedAt: now, rejectionReason: reason })
      .where(
        and(
          eq(driverDocuments.id, documentId),
          eq(driverDocuments.status, 'pending'),
          isNull(driverDocuments.deletedAt),
        ),
      )
      .returning();
    if (!doc) throw new DocumentError(`Document ${documentId} is not pending review`);
    await recordAudit(tx, {
      actorId: reviewerId,
      action: `document.${decision}`,
      entity: 'driver_document',
      entityId: doc.id,
      data: { driverId: doc.driverId, type: doc.type, reason },
    });
    return doc;
  });
}

/** Approved documents that expire within `withinDays` — for renewal reminders. */
export async function findExpiring(
  exec: Executor,
  withinDays: number,
  now = new Date(),
): Promise<DriverDocument[]> {
  const horizon = new Date(now.getTime() + withinDays * 86_400_000);
  return exec
    .select()
    .from(driverDocuments)
    .where(
      and(
        eq(driverDocuments.status, 'approved'),
        isNull(driverDocuments.deletedAt),
        gt(driverDocuments.expiresAt, now),
        lte(driverDocuments.expiresAt, horizon),
      ),
    );
}

/**
 * Flips documents past their expiry date to `expired` — approved ones, and
 * pending ones that lapsed before review. Returns how many.
 */
export async function expireDocuments(exec: Executor, now = new Date()): Promise<number> {
  const rows = await exec
    .update(driverDocuments)
    .set({ status: 'expired' })
    .where(
      and(
        inArray(driverDocuments.status, ['approved', 'pending']),
        lte(driverDocuments.expiresAt, now),
      ),
    )
    .returning({ id: driverDocuments.id });
  return rows.length;
}

/**
 * Short-lived download URLs for a document's files. Authorization — the
 * document's driver, or a reviewer — is the caller's job; this only signs.
 */
export async function documentDownloadUrls(
  exec: Executor,
  documentId: string,
  ttlSeconds = 300,
): Promise<{ field: string; url: string }[]> {
  const [doc] = await exec
    .select({ files: driverDocuments.files })
    .from(driverDocuments)
    .where(and(eq(driverDocuments.id, documentId), isNull(driverDocuments.deletedAt)));
  if (!doc) throw new DocumentError(`No document ${documentId}`);
  return Promise.all(
    doc.files.map(async (f) => ({
      field: f.field,
      url: await getSignedDownloadUrl('documents', f.r2Key, ttlSeconds),
    })),
  );
}
