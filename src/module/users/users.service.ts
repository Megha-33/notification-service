import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dto/user-registration.dto';
import { UserRepository } from './repositories/user.repository';
import { LoginDto } from './dto/user-login.dto';
import { DeviceRepository } from '../devices/repositories/device.repositories';
import * as bcrypt from 'bcrypt';
import { JwtService } from '../auth/jwt.service';
import { PreferencesRepository } from '../preferences/repositories/preferences.repository';
import { QueueService } from 'src/queue/queue.service';
import { SendEmailOptions } from 'src/email/interfaces/send-email.interface';
import { renderTemplate } from 'src/email/helpers/email.helper';
import { NotificationPayload } from 'src/firebase/notification.interface';
import { NotificationChannel, NotificationPriority, NotificationType } from '../notification/enums/notification.enum';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(
    private readonly userRepository: UserRepository,
    private readonly deviceRepository: DeviceRepository,
    private readonly jwtService: JwtService,
    private readonly preferencesRepository: PreferencesRepository,
    private readonly queueService: QueueService,
  ) { }

  async register(dto: RegisterDto) {
    this.logger.log('Register request received', { email: dto.email });

    // 1. Check if user exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      this.logger.warn('Register requested for existing email', {
        email: dto.email,
        userId: existingUser._id.toString(),
      });
    }
    const saltRounds = 10; // you can configure this (10-12 is standard)
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    // 3. Create user
    const user = await this.userRepository.createUser({
      email: dto.email,
      password: hashedPassword,
      name: dto.name,
    });
    // Create default preferences for new user
    await this.preferencesRepository.upsert(user._id.toString(), {});


    const html = await renderTemplate('welcome-email', {
      name: user.name,
      email: user.email,
    });

    const payload: SendEmailOptions = {
      to: user.email,
      subject: 'Welcome to Our Notification Service',
      html, 
    };
    await this.queueService.enqueueEmail(payload);

    const notificationPayload: NotificationPayload = {
      userId: user._id.toString(),
      type: NotificationType.WELCOME,
      title: 'Welcome to Our Service',
      body: 'Thank you for joining us!',
      priority: NotificationPriority.LOW,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      emailNotification: payload,
    }

    await this.queueService.enqueuePushNotification(notificationPayload);
    return {
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
      },
    };
  }

  async login(dto: LoginDto, ip: string) {
    // 1. Find user
    const user = await this.userRepository.findByEmailWithPassword(dto.email);

    if (!user) {
      this.logger.warn('Login failed: user not found', {
        email: dto.email,
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Validate password
    const isMatch = await bcrypt.compare(dto.password, user.password);

    if (!isMatch) {
      this.logger.warn('Login failed: password mismatch', {
        userId: user._id.toString(),
        deviceId: dto.deviceId,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Generate JWT
    const payload = {
      sub: user._id.toString(),
      email: user.email,
    };

    const token = this.jwtService.generateToken(payload);

    const existingDevice = await this.deviceRepository.findByUserAndDeviceId(
      user._id.toString(),
      dto.deviceId,
    );

    if (existingDevice) {
      await this.deviceRepository.updateDeviceById(existingDevice._id, {
        fcmToken: dto.fcmToken,
        deviceType: dto.deviceType,
        access_token: token,
        isActive: true,
        lastLoginAt: new Date(),
      });
    } else {
      await this.deviceRepository.createDevice({
        userId: user._id,
        fcmToken: dto.fcmToken,
        deviceType: dto.deviceType,
        access_token: token,
        deviceId: dto.deviceId,
        isActive: true,
        lastLoginAt: new Date(),
      });
    }

    const userResponse = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
    };

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken: token,
      },
    };
  }

  async logout(userId: string, deviceId: string) {

    const device = await this.deviceRepository.findByUserAndDeviceId(userId, deviceId);

    if (!device) {
      this.logger.warn('Logout skipped: device not found', { userId, deviceId });
      throw new UnauthorizedException('Device not found');
    }

    await this.deviceRepository.deactivateDevice(userId, deviceId);

    return {
      success: true,
      message: 'Logged out successfully',
      data: null,
    };
  }
}