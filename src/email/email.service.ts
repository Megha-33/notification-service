import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync } from 'fs';
import { createTransport, Transporter } from 'nodemailer';
import { join, resolve } from 'path';
import { renderFile } from 'ejs';
import {
  SendEmailOptions,
  SendTemplateEmailOptions,
} from './interfaces/send-email.interface';


@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;
  private readonly defaultFrom: string;
  private readonly templatesDir: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.getOrThrow<string>('email.host');
    const port = this.configService.getOrThrow<number>('email.port');
    const secure = this.configService.get<boolean>('email.secure', false);
    const user = this.configService.get<string | undefined>('email.user');
    const pass = this.configService.get<string | undefined>('email.pass');

    this.defaultFrom = this.configService.getOrThrow<string>('email.from');
    this.templatesDir = this.resolveTemplatesDirectory();

    this.transporter = createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    await this.transporter.sendMail({
      from: options.from ?? this.defaultFrom,
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  async sendTemplateEmail(options: SendTemplateEmailOptions): Promise<void> {
    const templatePath = join(this.templatesDir, `${options.templateName}.ejs`);
    const html = await renderFile(templatePath, options.context ?? {}, {
      async: true,
    });

    await this.sendEmail({
      to: options.to,
      subject: options.subject,
      html,
      cc: options.cc,
      bcc: options.bcc,
      from: options.from,
      replyTo: options.replyTo,
    });
  }

  private resolveTemplatesDirectory(): string {
    const configuredDir = this.configService.get<string | undefined>(
      'email.templatesDir',
    );
    if (configuredDir) {
      return resolve(configuredDir);
    }

    const distPath = resolve(process.cwd(), 'dist', 'email', 'templates');
    if (existsSync(distPath)) {
      return distPath;
    }

    this.logger.warn(
      'Using source templates directory fallback. Set EMAIL_TEMPLATES_DIR in production.',
    );
    return resolve(process.cwd(), 'src', 'email', 'templates');
  }

 
}
