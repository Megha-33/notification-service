import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
// import * as bcrypt from 'bcrypt';

export type UserDocument = User & Document;

@Schema({
  timestamps: true, // auto manages createdAt & updatedAt
})
export class User {
  // Authentication
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({
    required: true,
    minlength: 6,
    select: false, // never return password by default
  })
  password: string;

  @Prop({ trim: true })
  name: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop({ default: false, index: true })
  isDeleted: boolean;

}

export const UserSchema = SchemaFactory.createForClass(User);