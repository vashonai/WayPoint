import { env } from '../env';

/**
 * Where OTP codes go. Real providers (a Caribbean SMS aggregator, Twilio)
 * implement this; nothing else in the server knows which one is in use.
 */
export interface SmsProvider {
  send(message: { to: string; body: string }): Promise<void>;
}

/** Prints messages instead of sending them. Local development only. */
export class ConsoleSmsProvider implements SmsProvider {
  readonly sent: { to: string; body: string }[] = [];

  async send(message: { to: string; body: string }): Promise<void> {
    this.sent.push(message);
    console.log(`[sms → ${message.to}] ${message.body}`);
  }
}

export function createSmsProvider(): SmsProvider {
  const { SMS_PROVIDER } = env.sms();
  switch (SMS_PROVIDER) {
    case 'console':
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SMS_PROVIDER=console would print OTP codes to production logs');
      }
      return new ConsoleSmsProvider();
  }
}
