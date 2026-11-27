import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * `.env` is written by `neon env pull` / `neon deploy` (DATABASE_URL and
 * friends point at Neon). `.env.local`, if present, wins — use it to point a
 * machine at the local Docker stack without editing the Neon-managed file.
 * Both are git-ignored. Real environment variables beat both.
 */
dotenv.config({ path: ['.env.local', '.env'], quiet: true });

/**
 * Environment, validated per area on first use.
 *
 * A script that only touches the database doesn't fail for want of an SMS
 * key, and one that does need a value fails at startup naming the variable —
 * not deep inside a request.
 */
function read<T extends z.ZodType>(schema: T, area: string): z.infer<T> {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    throw new Error(`Invalid ${area} environment — ${issues.join('; ')}`);
  }
  return parsed.data;
}

const dbSchema = z
  .object({
    /** Pooled (PgBouncer, `-pooler` host on Neon). Application traffic. */
    DATABASE_URL: z.url(),
    /** Direct. Migrations and anything needing session state (Neon skill guidance). */
    DATABASE_URL_UNPOOLED: z.url().optional(),
  })
  .transform((e) => ({ ...e, migrationUrl: e.DATABASE_URL_UNPOOLED ?? e.DATABASE_URL }));

const valkeySchema = z.object({ VALKEY_URL: z.url() });

const storageSchema = z.object({
  R2_ENDPOINT: z.url(),
  R2_REGION: z.string().default('auto'),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_FORCE_PATH_STYLE: z.stringbool().default(false),
  R2_BUCKET_EVIDENCE: z.string().min(1),
  R2_BUCKET_DOCUMENTS: z.string().min(1),
});

const authSchema = z.object({
  AUTH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  AUTH_URL: z.url(),
  AUTH_TRUSTED_ORIGINS: z
    .string()
    .default('')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

const smsSchema = z.object({
  SMS_PROVIDER: z.enum(['console']).default('console'),
  SMS_API_KEY: z.string().optional(),
  SMS_SENDER_ID: z.string().default('Waypoint'),
});

const emailSchema = z.object({
  EMAIL_PROVIDER: z.enum(['console']).default('console'),
  EMAIL_FROM: z.string().default('Waypoint <no-reply@waypoint.example>'),
});

export const env = {
  db: () => read(dbSchema, 'database'),
  valkey: () => read(valkeySchema, 'Valkey'),
  storage: () => read(storageSchema, 'storage'),
  auth: () => read(authSchema, 'auth'),
  sms: () => read(smsSchema, 'SMS'),
  email: () => read(emailSchema, 'email'),
};
