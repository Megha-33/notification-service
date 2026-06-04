import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { FirebaseService } from '../firebase/firebase.service';
import { SEND_PUSH_JOB, NOTIFICATION_QUEUE } from './queue.constants';
import { NotificationPayload } from 'src/firebase/notification.interface';
import { EmailService } from 'src/email/email.service';
import { SendEmailOptions, SendTemplateEmailOptions } from 'src/email/interfaces/send-email.interface';


@Injectable()
@Processor(NOTIFICATION_QUEUE)
export class QueueProcessor {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly emailService: EmailService,
  ) { }

  @Process(SEND_PUSH_JOB)
  async handlePushNotification(job: Job<NotificationPayload>) {
    const { userId, title, body, type, priority, channels } = job.data;

    this.logger.log('Queue job started', {
      jobId: job.id,
      userId,
      channels,
      type,
      priority,
    });

    try {

      console.log("job data", job.data);

      const result = await this.firebaseService.sendNotification({
        userId,
        title,
        body,
        type,
        priority,
        channels,
        imageUrl: job.data.imageUrl,
        iconUrl: job.data.iconUrl,
        deepLink: job.data.deepLink,
        actions: job.data.actions,
        metadata: job.data.metadata,
      });

      console.log("send notification result", result);


      this.logger.log('Queue job completed', {
        jobId: job.id,
        userId,
        notificationId: result?.data?._id?.toString?.() ?? result?.data?._id,
        status: result?.data?.status,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Queue job failed: ${message} | jobId=${job.id} | userId=${userId} | channels=${(channels ?? []).join(',')}`,
        stack,
      );
      throw error;
    }
  }

  @Process('send-email')
  async handleSendEmail(job: Job<SendEmailOptions>) {

    const emailOptions: SendEmailOptions = {
      to: job.data.to,
      subject: job.data.subject,
      cc: job.data.cc || '',
      bcc: job.data.bcc || '',
      from: job.data.from || '',
      replyTo: job.data.replyTo || '',
      // templateName: 'generic',
      html: job.data.html || '',

    }

    try {
      await this.emailService.sendEmail(emailOptions);

      this.logger.log(`Email sent to ${emailOptions.to}`);
    } catch (error: unknown) {
      this.logger.error(`Failed to send email to ${emailOptions.to}`, (error as Error).stack);
      throw error; 
    }
  }
}
