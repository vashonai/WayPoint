import { randomUUID } from 'node:crypto';

import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../env';

/**
 * Cloudflare R2 through the S3 API (RustFS locally). Both buckets are
 * private: the app never sees credentials, only short-lived signed URLs the
 * backend issues after its own authorization check. The database stores the
 * object KEY, never the file.
 */

export type BucketName = 'evidence' | 'documents';

/** What each bucket accepts. Anything else is refused before a URL is signed. */
const ALLOWED_TYPES: Record<BucketName, readonly string[]> = {
  evidence: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
  documents: ['image/jpeg', 'image/png', 'image/heic', 'image/webp', 'application/pdf'],
};

/** Upper bounds on URL lifetime. Documents hold IDs and police records. */
const MAX_TTL_SECONDS: Record<BucketName, number> = { evidence: 3600, documents: 900 };

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

let shared: { s3: S3Client; buckets: Record<BucketName, string> } | null = null;

function storage() {
  if (!shared) {
    const cfg = env.storage();
    shared = {
      s3: new S3Client({
        endpoint: cfg.R2_ENDPOINT,
        region: cfg.R2_REGION,
        forcePathStyle: cfg.R2_FORCE_PATH_STYLE,
        credentials: {
          accessKeyId: cfg.R2_ACCESS_KEY_ID,
          secretAccessKey: cfg.R2_SECRET_ACCESS_KEY,
        },
      }),
      buckets: { evidence: cfg.R2_BUCKET_EVIDENCE, documents: cfg.R2_BUCKET_DOCUMENTS },
    };
  }
  return shared;
}

export function assertAllowedType(bucket: BucketName, contentType: string): string {
  if (!ALLOWED_TYPES[bucket].includes(contentType)) {
    throw new Error(`${contentType} is not accepted in the ${bucket} bucket`);
  }
  return EXTENSIONS[contentType] ?? 'bin';
}

/** `drivers/{driverId}/{docType}/{uuid}.{ext}` — the prefix is what ownership checks match. */
export function documentKey(driverId: string, docType: string, contentType: string): string {
  return `drivers/${driverId}/${docType}/${randomUUID()}.${assertAllowedType('documents', contentType)}`;
}

/** `trips/{tripId}/{uuid}.{ext}` */
export function evidenceKey(tripId: string, contentType: string): string {
  return `trips/${tripId}/${randomUUID()}.${assertAllowedType('evidence', contentType)}`;
}

const clampTtl = (bucket: BucketName, ttl: number) =>
  Math.max(1, Math.min(Math.floor(ttl), MAX_TTL_SECONDS[bucket]));

/**
 * A presigned PUT. The client must send exactly this `Content-Type` — it is
 * part of the signature. (R2 supports presigned PUT, not POST policies.)
 */
export async function getSignedUploadUrl(
  bucket: BucketName,
  key: string,
  contentType: string,
  ttlSeconds = 300,
): Promise<{ url: string; method: 'PUT'; headers: { 'Content-Type': string }; expiresAt: Date }> {
  assertAllowedType(bucket, contentType);
  const { s3, buckets } = storage();
  const expiresIn = clampTtl(bucket, ttlSeconds);
  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: buckets[bucket], Key: key, ContentType: contentType }),
    { expiresIn },
  );
  return {
    url,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    expiresAt: new Date(Date.now() + expiresIn * 1000),
  };
}

/** A presigned GET, capped per bucket (15 minutes for documents). */
export async function getSignedDownloadUrl(
  bucket: BucketName,
  key: string,
  ttlSeconds = 300,
): Promise<string> {
  const { s3, buckets } = storage();
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: buckets[bucket], Key: key }), {
    expiresIn: clampTtl(bucket, ttlSeconds),
  });
}

/**
 * LOCAL ONLY: creates the two buckets if missing. On R2 the buckets are
 * created once in the Cloudflare dashboard with their own access policy.
 */
export async function ensureLocalBuckets(): Promise<void> {
  const { s3, buckets } = storage();
  for (const name of Object.values(buckets)) {
    try {
      await s3.send(new HeadBucketCommand({ Bucket: name }));
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: name }));
    }
  }
}
