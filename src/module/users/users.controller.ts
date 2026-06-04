import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/user-registration.dto';
import { LoginDto } from './dto/user-login.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { Request } from 'express';

import {
  ApiWrappedOkResponse,
  ApiWrappedCreatedResponse,
  ApiDefaultErrorResponses,
} from '../../swagger/swagger.decorators';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogoutDto } from './dto/logout.dto';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiWrappedOkResponse({
    description: 'Users fetched successfully',
    dataModel: UserResponseDto,
    isArray: true,
  })
  @ApiDefaultErrorResponses()
  findAll() {
    return {
      success: true,
      message: 'Users fetched successfully',
      data: [], // should be array
      meta: null,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register')
  @ApiWrappedCreatedResponse({
    description: 'User registered successfully',
    dataModel: AuthResponseDto,
  })
  @ApiDefaultErrorResponses()
  async register(@Body() dto: RegisterDto) {
    return this.usersService.register(dto);
  }

  @Post('login')
  @ApiWrappedOkResponse({
    description: 'Login successful',
    dataModel: AuthResponseDto,
  })
  @ApiDefaultErrorResponses()
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip =
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress;

    return this.usersService.login(dto, ip as string);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)

  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout user (invalidate device)' })

  @ApiWrappedOkResponse({
    description: 'User logged out successfully',
  })
  @ApiDefaultErrorResponses()

  async logout(
    @GetUser('userId') userId: string,
    @Body() dto: LogoutDto,
  ) {
    return this.usersService.logout(userId, dto.deviceId);
  }
}