interface ReporterInterviewInviteEmailInput {
  interviewId: string;
  interviewTitle: string;
  intervieweeName: string;
  purpose: string;
  language: string;
  senderName: string;
  replyToEmail?: string | null;
  origin: string;
}

export function buildReporterInterviewInviteEmail(
  input: ReporterInterviewInviteEmailInput
) {
  const interviewUrl = `${input.origin}/interviews/${input.interviewId}`;
  const subject = `Highlander Today interview invitation: ${input.interviewTitle}`;
  const html = `
    <div style="font-family: Georgia, serif; line-height: 1.6; color: #172033;">
      <h1 style="margin-bottom: 12px;">Highlander Today Interview Invitation</h1>
      <p>Hello ${input.intervieweeName},</p>
      <p>
        Highlander Today would like to invite you to complete a guided browser interview related to
        <strong> ${input.interviewTitle}</strong>.
      </p>
      <p>${input.purpose}</p>
      <p>
        Preferred language for this interview: <strong>${input.language}</strong>.
        You can confirm or adjust that choice when the session begins.
      </p>
      <p style="margin-top: 20px;">
        <a
          href="${interviewUrl}"
          style="display: inline-block; border-radius: 999px; background: #12436b; color: #ffffff; text-decoration: none; padding: 12px 20px; font-weight: 600;"
        >
          Open Interview
        </a>
      </p>
      <p style="margin-top: 20px;">If the button does not work, use this link:</p>
      <p><a href="${interviewUrl}">${interviewUrl}</a></p>
      <p style="margin-top: 24px;">
        Sent by ${input.senderName} for Highlander Today.
      </p>
    </div>
  `;
  const text =
    `Highlander Today Interview Invitation\n\n` +
    `Hello ${input.intervieweeName},\n\n` +
    `Highlander Today would like to invite you to complete a guided browser interview related to ${input.interviewTitle}.\n\n` +
    `${input.purpose}\n\n` +
    `Preferred language: ${input.language}. You can confirm or adjust that choice when the session begins.\n\n` +
    `Open interview: ${interviewUrl}\n\n` +
    `Sent by ${input.senderName} for Highlander Today.`;

  return {
    subject,
    html,
    text,
    interviewUrl,
    replyTo: input.replyToEmail
      ? {
          email: input.replyToEmail,
          name: input.senderName,
        }
      : undefined,
  };
}
