import {
    Controller,
    Get,
    Param,
    Query,
    UseGuards,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

import {
    ApiBearerAuth,
    ApiOperation,
    ApiTags,
    ApiQuery,
    ApiParam,
} from '@nestjs/swagger';

import {
    ApiWrappedOkResponse,
    ApiDefaultErrorResponses,
} from '../../swagger/swagger.decorators';

import { DeviceResponseDto } from './dto/device-response.dto';

@ApiTags('Devices')
@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get logged-in user devices' })

    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })

    @ApiWrappedOkResponse({
        description: 'User devices retrieved successfully',
        dataModel: DeviceResponseDto,
        isArray: true,
    })
    @ApiDefaultErrorResponses()
    async getUserDevices(
        @GetUser('userId') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        const data = await this.devicesService.getUserDevices(
            userId,
            Number(page),
            Number(limit),
        );

        return {
            success: true,
            message: 'User devices retrieved successfully',
            data: data.devices,
            meta: {
                total: data.total,
                page: data.page,
                limit: data.limit,
            },
            timestamp: new Date().toISOString(),
        };
    }


    @Get(':userId')
    @UseGuards(JwtAuthGuard) // optional: keep if protected
    @ApiBearerAuth('access-token')
    @ApiOperation({ summary: 'Get devices by userId' })

    @ApiParam({ name: 'userId', required: true, example: '65f1a2b3c4d5e6f7a8b9c0d1' })
    @ApiQuery({ name: 'page', required: false, example: 1 })
    @ApiQuery({ name: 'limit', required: false, example: 10 })

    @ApiWrappedOkResponse({
        description: 'Devices retrieved successfully',
        dataModel: DeviceResponseDto,
        isArray: true,
    })
    @ApiDefaultErrorResponses()
    async getDevicesByUserId(
        @Param('userId') userId: string,
        @Query('page') page = 1,
        @Query('limit') limit = 10,
    ) {
        const data = await this.devicesService.getUserDevices(
            userId,
            Number(page),
            Number(limit),
        );

        return {
            success: true,
            message: 'Devices retrieved successfully',
            data: data.devices,
            meta: {
                total: data.total,
                page: data.page,
                limit: data.limit,
            },
            timestamp: new Date().toISOString(),
        };
    }
}