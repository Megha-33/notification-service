import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, Types } from 'mongoose';
import { NotificationChannel, NotificationStatus } from '../enums/notification.enum';
import { Notification } from '../schemas/notification.schema';
import { QueryNotificationDto } from '../dto/query-notification.dto';

@Injectable()
export class NotificationRepository {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) { }

  async create(data: Partial<Notification>) {
    return this.notificationModel.create(data);
  }

  async findAll(
    userId: string,
    queryDto: QueryNotificationDto,
  ) {
    const {
      type,
      status,
      isRead,
      priority,
      channels,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;

    const query: any = {
      userId: new Types.ObjectId(userId),
    };

    if (type) query.type = type;
    if (status) query.status = status;
    if (isRead) query.isRead = isRead;
    if (priority) query.priority = priority;
    if (channels && channels.length > 0) {
      query.channels = { $in: channels };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { body: { $regex: search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const sort: any = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),

      this.notificationModel.countDocuments(query),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByIdandUserId(id: string, userId: string) {
    const data = await this.notificationModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    return data;
  }

  async findById(id: string | Types.ObjectId) {
    return this.notificationModel.findById(id);
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.notificationModel.findOne({
      _id: new Types.ObjectId(id),
      userId: new Types.ObjectId(userId),
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    notification.readAt = new Date();

    await notification.save();
    return notification;
  }

  async updateStatus(id: string, status: string) {
    return this.notificationModel.findByIdAndUpdate(id, { status }, {
      new: true,
    });
  }

  async findByFcmToken(fcmToken: string) {
    return this.notificationModel.findOne({ fcmToken, isactive: true });
  }

  async updateMany(ids: string[], update: Partial<Notification>) {
    const objectIds = ids.map((id) => new Types.ObjectId(id));

    return this.notificationModel.updateMany(
      { _id: { $in: objectIds } },
      update,
    );
  }

  async findAllByUserId(
    userId: string,
  ) {
    const notifications = await this.notificationModel.find(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      }
    )
    return notifications;
  }

  async findNotificationsByUserIdAndId(
    userId: string,
    id: string,
  ) {
    const notifications = await this.notificationModel.find(
      {
        userId: new Types.ObjectId(userId),
        _id: new Types.ObjectId(id),
        isRead: false,
      }
    )
    return notifications;
  }

  async updateChannelStatus(
    notificationId: string,
    channel: NotificationChannel,
    status: NotificationStatus,
  ) {
    return this.notificationModel.updateOne(
      { _id: new Types.ObjectId(notificationId) },
      {
        $set: {
          [`channelStatus.${channel}`]: status,
        },
      },
    );
  }
}