export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
}

export interface SendTemplateEmailOptions {
  to: string | string[];
  subject: string;
  templateName: string;
  context?: Record<string, unknown>;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  replyTo?: string;
}
