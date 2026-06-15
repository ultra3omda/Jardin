import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { AllowDuringOnboarding } from '../auth/decorators/allow-during-onboarding.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompleteOnboardingDto, OnboardingStatusDto } from './dto/complete-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth('access-token')
@Roles(UserRole.SCHOOL_ADMIN)
@AllowDuringOnboarding() // this IS the unblock — never gate it
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboarding: OnboardingService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get onboarding status for the current organization' })
  @ApiResponse({ status: 200, type: OnboardingStatusDto })
  async status(): Promise<OnboardingStatusDto> {
    return this.onboarding.status();
  }

  @Post('complete')
  @ApiOperation({
    summary: 'Complete the blocking onboarding wizard (name + colors + logo)',
    description: 'Confirms the org name, persists branding and flips the tenant to ACTIVE.',
  })
  @ApiResponse({ status: 201, type: OnboardingStatusDto })
  async complete(@Body() dto: CompleteOnboardingDto): Promise<OnboardingStatusDto> {
    return this.onboarding.complete(dto);
  }
}
