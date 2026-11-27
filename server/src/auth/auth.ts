import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { expo } from '@better-auth/expo';
import { betterAuth } from 'better-auth';
import { emailOTP, phoneNumber } from 'better-auth/plugins';

import type { Db } from '../db/client';
import { accounts, sessions, users, verifications } from '../db/schema';
import { env } from '../env';
import type { EmailProvider } from './email';
import type { SmsProvider } from './sms';

/**
 * Placeholder email for phone-only sign-ups. Better Auth requires a unique
 * email on every user; `.invalid` is reserved (RFC 2606) so nothing is ever
 * delivered to it, and it is replaced when the user adds a real address.
 */
export const placeholderEmail = (phone: string) =>
  `${phone.replace(/\D/g, '')}@phone.waypoint.invalid`;

/**
 * Better Auth, self-hosted in the backend, over Waypoint's own tables.
 *
 * Phone OTP is the primary sign-in (the launch market signs up by phone);
 * email OTP is the second factor of contact. The `expo` plugin lets the app
 * keep its session in SecureStore and trusts the app's `waypoint://` scheme.
 *
 * Authorization is NOT here: Better Auth says who the user is; the data layer
 * (e.g. getTripForParticipant) decides what they may see.
 *
 * The HTTP handler (`auth.handler`) is mounted by the API server — next phase.
 */
export function createAuth({ db, sms, email }: { db: Db; sms: SmsProvider; email: EmailProvider }) {
  const { AUTH_SECRET, AUTH_URL, AUTH_TRUSTED_ORIGINS } = env.auth();

  return betterAuth({
    secret: AUTH_SECRET,
    baseURL: AUTH_URL,
    trustedOrigins: AUTH_TRUSTED_ORIGINS,
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: { users, sessions, accounts, verifications },
    }),
    user: {
      modelName: 'users',
      additionalFields: {
        // Server-owned: never accepted from a sign-up or profile update.
        role: { type: 'string', required: false, defaultValue: 'user', input: false },
        status: { type: 'string', required: false, defaultValue: 'active', input: false },
        countryCode: { type: 'string', required: false, input: true },
      },
    },
    session: { modelName: 'sessions' },
    account: { modelName: 'accounts' },
    verification: { modelName: 'verifications' },
    // Postgres generates the UUIDs (gen_random_uuid() defaults on every table).
    advanced: { database: { generateId: false } },
    emailAndPassword: { enabled: false },
    plugins: [
      phoneNumber({
        sendOTP: async ({ phoneNumber: to, code }) => {
          await sms.send({ to, body: `Your Waypoint code is ${code}. It expires in 5 minutes.` });
        },
        signUpOnVerification: {
          getTempEmail: placeholderEmail,
          getTempName: (phone) => phone,
        },
      }),
      emailOTP({
        sendVerificationOTP: async ({ email: to, otp }) => {
          await email.send({
            to,
            subject: 'Your Waypoint code',
            text: `Your Waypoint code is ${otp}. It expires in 5 minutes.`,
          });
        },
      }),
      expo(),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
