import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from '../schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) { }

  // Find user by email
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email, isDeleted: false });
  }

  //  Find user by email with password (for login)
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email, isDeleted: false })
      .select('+password');
  }

  //  Create user
  async createUser(data: Partial<User>): Promise<UserDocument> {
    return this.userModel.create(data);
  }

  // Update last login
  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      {
        lastLoginAt: new Date(),
        loginAttempts: 0,
      },
    );
  }

  //  Soft delete user
  async softDelete(userId: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { isDeleted: true },
    );
  }

  //  Find by ID
  async findById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }
}