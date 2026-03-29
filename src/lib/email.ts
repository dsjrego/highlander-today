type EmailRecipient = {
  email: string;
  name?: string;
};

type SendEmailInput = {
  to: EmailRecipient | EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: EmailRecipient;
  tags?: string[];
};

type BrevoSendEmailPayload = {
  sender: {
    email: string;
    name?: string;
  };
  to: Array<{
    email: string;
    name?: string;
  }>;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: {
    email: string;
    name?: string;
  };
  tags?: string[];
};

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function normalizeRecipients(
  value: EmailRecipient | EmailRecipient[],
): EmailRecipient[] {
  return Array.isArray(value) ? value : [value];
}

function requireEmailEnv(name: 'BREVO_API_KEY' | 'EMAIL_FROM' | 'EMAIL_FROM_NAME'): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required email environment variable: ${name}`);
  }

  return value;
}

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.BREVO_API_KEY?.trim() &&
      process.env.EMAIL_FROM?.trim() &&
      process.env.EMAIL_FROM_NAME?.trim(),
  );
}

export async function sendTransactionalEmail(input: SendEmailInput): Promise<void> {
  const apiKey = requireEmailEnv('BREVO_API_KEY');
  const fromEmail = requireEmailEnv('EMAIL_FROM');
  const fromName = requireEmailEnv('EMAIL_FROM_NAME');

  const recipients = normalizeRecipients(input.to).map((recipient) => ({
    email: recipient.email.trim(),
    name: recipient.name?.trim() || undefined,
  }));

  if (recipients.length === 0) {
    throw new Error('At least one email recipient is required');
  }

  const payload: BrevoSendEmailPayload = {
    sender: {
      email: fromEmail,
      name: fromName,
    },
    to: recipients,
    subject: input.subject.trim(),
    htmlContent: input.html,
  };

  if (input.text?.trim()) {
    payload.textContent = input.text.trim();
  }

  if (input.replyTo?.email.trim()) {
    payload.replyTo = {
      email: input.replyTo.email.trim(),
      name: input.replyTo.name?.trim() || undefined,
    };
  }

  if (input.tags?.length) {
    payload.tags = input.tags
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return;
  }

  const errorText = await response.text();
  throw new Error(
    `Brevo send failed with status ${response.status}: ${errorText || 'Unknown error'}`,
  );
}
