import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendEmailNotificationDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  body: string; // raw HTML or text

  @IsString()
  @IsOptional()
  templateName: string;

  @IsOptional()
  context?: Record<string, any>;

  @IsOptional()
  @IsEmail()
  cc?: string;

  @IsOptional()
  @IsEmail()
  bcc?: string;
}