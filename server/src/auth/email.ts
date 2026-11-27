import { env } from '../env';

/** Where email OTP codes go. Same shape as SmsProvider, for the same reason. */
export interface EmailProvider {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

/** Prints messages instead of sending them. Local development only. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly sent: { to: string; subject: string; text: string }[] = [];

  async send(message: { to: string; subject: string; text: string }): Promise<void> {
    this.sent.push(message);
    console.log(`[email → ${message.to}] ${message.subject}: ${message.text}`);
  }
}

export function createEmailProvider(): EmailProvider {
  const { EMAIL_PROVIDER } = env.email();
  switch (EMAIL_PROVIDER) {
    case 'console':
      if (process.env.NODE_ENV === 'production') {
        throw new Error('EMAIL_PROVIDER=console would print OTP codes to production logs');
      }
      return new ConsoleEmailProvider();
  }
}
