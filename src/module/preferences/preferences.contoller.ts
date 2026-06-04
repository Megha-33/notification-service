import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { UpdatePreferencesDto } from '../preferences/dtos/preferences.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';

@ApiTags('Preferences')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @ApiOperation({ summary: 'Get my notification preferences' })
  @Get()
  async getPreferences(@GetUser('userId') userId: string) {
    return this.preferencesService.getPreferences(userId);
  }

  @ApiOperation({ summary: 'Update my notification preferences' })
  @Patch()
  async updatePreferences(
    @GetUser('userId') userId: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(userId, dto);
  }
}