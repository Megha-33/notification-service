import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { BulkMarkAsReadDto } from './dto/bulk-mark-read.dto';
import { ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SendNotificationDto } from './dto/send-notification.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendEmailNotificationDto } from './dto/email.notification';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { NotificationChannel } from './enums/notification.enum';


@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
  ) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'channels',
    required: false,
    isArray: true,
    enum: NotificationChannel,
    style: 'form',
    explode: true,
  })
  async findAll(
    @GetUser('userId') userId: string,
    @Query() query: QueryNotificationDto
  ) {
    const data = await this.notificationService.findAll(userId, query);

    return {
      success: true,
      message: 'Notifications retrieved successfully',
      data: data.data,
      meta: data.meta,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('read/bulk')
  async markBulkAsRead(
    @Body() dto: BulkMarkAsReadDto
  ) {
    return this.notificationService.markBulkAsRead(dto.ids);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('user/read/bulk')
  async markBulkAsReadByUser(
    @GetUser('userId') userId: string,
  ) {
    return this.notificationService.markBulkAsReadByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Patch('read/:id')
  async markAsRead(@Param('id') notificationId: string,
    @GetUser('userId') userId: string
  ) {

    return this.notificationService.markAsRead(notificationId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @Get(':id')
  async findById(
    @GetUser('userId') userId: string,
    @Param('id') notificationId: string) {

    return this.notificationService.findById(notificationId, userId);
  }

  @Post('test')
  @ApiOperation({ summary: 'Send notification (event-based)' })
  async sendNotification(@Body() dto: SendNotificationDto) {
    await this.notificationService.sendNotification(dto);

    return {
      success: true,
      message: 'Notification event queued successfully',
      data: {
        userId: dto.userId,
        title: dto.title,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test/email')
  @ApiOperation({ summary: 'Send Email Notification (event-based)' })
  async sendEmailNotification(@Body() dto: SendEmailNotificationDto) {
    await this.notificationService.sendEmailNotification(dto);

    return {
      success: true,
      message: 'Email notification queued successfully',
      data: {
        to: dto.to,
        subject: dto.subject,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Post('test/websocket')
  @ApiOperation({ summary: 'Send WebSocket Notification (real-time)' })
  async sendNotificationWebSocket(@Body() dto: SendNotificationDto) {
    await this.notificationService.sendNotificationWebSocket(dto);

    return {
      success: true,
      message: 'WebSocket notification emitted successfully',
      data: {
        userId: dto.userId,
        title: dto.title,
      },
      timestamp: new Date().toISOString(),
    };
  }


}