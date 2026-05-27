import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  BillingDashboardStatsDto,
  CreateInvoiceDto,
  InvoiceQueryDto,
  InvoiceResponseDto,
  ListInvoicesResponseDto,
  RecordPaymentDto,
  UpdateInvoiceDto,
} from './dto/billing.dto';
import { BillingService } from './billing.service';

/** V8 — Billing / Invoices & Payments (SCHOOL_ADMIN). */
@ApiTags('billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  // NOTE: /stats must be declared BEFORE /:id routes to avoid NestJS routing ambiguity.

  @Get('stats')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get billing dashboard statistics for the tenant' })
  @ApiResponse({ status: 200, type: BillingDashboardStatsDto })
  getStats(@CurrentUser() user: AuthenticatedUser): Promise<BillingDashboardStatsDto> {
    return this.service.getDashboardStats(user.tenantId!);
  }

  @Get('invoices')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'List invoices (paginated, optional filters: status, studentId)' })
  @ApiResponse({ status: 200, type: ListInvoicesResponseDto })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: InvoiceQueryDto,
  ): Promise<ListInvoicesResponseDto> {
    return this.service.findAll(user.tenantId!, query);
  }

  @Post('invoices')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Create an invoice with line items' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.service.create(user.tenantId!, dto);
  }

  @Get('invoices/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Get a single invoice (with items, payments, student info)' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<InvoiceResponseDto> {
    return this.service.findOne(user.tenantId!, id);
  }

  @Patch('invoices/:id')
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update invoice status, dueDate, or notes' })
  @ApiResponse({ status: 200, type: InvoiceResponseDto })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ): Promise<InvoiceResponseDto> {
    return this.service.update(user.tenantId!, id, dto);
  }

  @Delete('invoices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Cancel an invoice (soft delete — sets status to CANCELLED)' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return this.service.remove(user.tenantId!, id);
  }

  @Post('invoices/:id/payments')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Record a payment — auto-updates invoice status (PARTIAL / PAID)' })
  @ApiResponse({ status: 201, type: InvoiceResponseDto })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') invoiceId: string,
    @Body() dto: RecordPaymentDto,
  ): Promise<InvoiceResponseDto> {
    return this.service.recordPayment(user.tenantId!, invoiceId, dto);
  }
}
