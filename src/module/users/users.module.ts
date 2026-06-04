import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { User, UserSchema } from './schemas/user.schema';
import { UserRepository } from './repositories/user.repository';
import { DevicesModule } from '../devices/devices.module';
import { JwtModule } from '../auth/jwt.module';
import { PreferencesModule } from '../preferences/preferences.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
        ]),
        DevicesModule,
        JwtModule,
        PreferencesModule
    ],
    controllers: [UsersController],
    providers: [UsersService, UserRepository],
    exports: [UserRepository],
})
export class UsersModule { }