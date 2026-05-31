import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import type {
  BusRouteResponseDto,
  CreateBusRouteDto,
  CreateBusStopDto,
  ListBusRoutesResponseDto,
  UpdateBusRouteDto,
} from './dto/bus-route.dto';

type Row = Prisma.BusRouteGetPayload<{
  include: { stops: true; _count: { select: { assignments: true } } };
}>;

@Injectable()
export class BusRoutesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser): Promise<ListBusRoutesResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const where: Prisma.BusRouteWhereInput = { tenantId: user.tenantId, deletedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.busRoute.findMany({
        where,
        include: { stops: { orderBy: { order: 'asc' } }, _count: { select: { assignments: true } } },
        orderBy: { name: 'asc' },
      }),
      this.prisma.busRoute.count({ where }),
    ]);
    return { items: rows.map((r) => this.toResponse(r)), total };
  }

  async getById(id: string, user: AuthenticatedUser): Promise<BusRouteResponseDto> {
    const row = await this.findRouteOrThrow(id, user);
    return this.toResponse(row);
  }

  async create(dto: CreateBusRouteDto, user: AuthenticatedUser): Promise<BusRouteResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const tenantId = user.tenantId;
    const routeId = createId();
    const stops = dto.stops ?? [];
    await this.prisma.$transaction(async (tx) => {
      await tx.busRoute.create({
        data: {
          id: routeId,
          tenantId,
          name: dto.name.trim(),
          driverName: dto.driverName ?? null,
          driverPhone: dto.driverPhone ?? null,
          vehiclePlate: dto.vehiclePlate ?? null,
          departureTime: dto.departureTime,
          returnTime: dto.returnTime ?? null,
          status: dto.status ?? 'ACTIVE',
          capacity: dto.capacity ?? null,
        },
      });
      if (stops.length > 0) {
        await tx.busStop.createMany({
          data: stops.map((s: CreateBusStopDto) => ({
            id: createId(),
            tenantId,
            routeId,
            name: s.name.trim(),
            order: s.order,
            pickupTime: s.pickupTime ?? null,
          })),
        });
      }
    });
    return this.getById(routeId, user);
  }

  async update(
    id: string,
    dto: UpdateBusRouteDto,
    user: AuthenticatedUser,
  ): Promise<BusRouteResponseDto> {
    await this.findRouteOrThrow(id, user);
    await this.prisma.busRoute.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.driverName !== undefined ? { driverName: dto.driverName } : {}),
        ...(dto.driverPhone !== undefined ? { driverPhone: dto.driverPhone } : {}),
        ...(dto.vehiclePlate !== undefined ? { vehiclePlate: dto.vehiclePlate } : {}),
        ...(dto.departureTime !== undefined ? { departureTime: dto.departureTime } : {}),
        ...(dto.returnTime !== undefined ? { returnTime: dto.returnTime } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
      },
    });
    return this.getById(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.findRouteOrThrow(id, user);
    await this.prisma.busRoute.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addStop(
    routeId: string,
    dto: CreateBusStopDto,
    user: AuthenticatedUser,
  ): Promise<BusRouteResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    await this.findRouteOrThrow(routeId, user);
    await this.prisma.busStop.create({
      data: {
        id: createId(),
        tenantId: user.tenantId,
        routeId,
        name: dto.name.trim(),
        order: dto.order,
        pickupTime: dto.pickupTime ?? null,
      },
    });
    return this.getById(routeId, user);
  }

  async removeStop(
    routeId: string,
    stopId: string,
    user: AuthenticatedUser,
  ): Promise<BusRouteResponseDto> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    await this.findRouteOrThrow(routeId, user);
    const res = await this.prisma.busStop.deleteMany({
      where: { id: stopId, tenantId: user.tenantId, routeId },
    });
    if (res.count === 0) throw new NotFoundException({ code: 'BUS_STOP_NOT_FOUND' });
    return this.getById(routeId, user);
  }

  private async findRouteOrThrow(id: string, user: AuthenticatedUser): Promise<Row> {
    if (!user.tenantId) throw new ForbiddenException({ code: 'TENANT_REQUIRED' });
    const row = await this.prisma.busRoute.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: { stops: { orderBy: { order: 'asc' } }, _count: { select: { assignments: true } } },
    });
    if (!row) throw new NotFoundException({ code: 'BUS_ROUTE_NOT_FOUND' });
    return row;
  }

  private toResponse(r: Row): BusRouteResponseDto {
    return {
      id: r.id,
      name: r.name,
      driverName: r.driverName,
      driverPhone: r.driverPhone,
      vehiclePlate: r.vehiclePlate,
      departureTime: r.departureTime,
      returnTime: r.returnTime,
      status: r.status,
      capacity: r.capacity,
      stops: r.stops.map((s) => ({
        id: s.id,
        name: s.name,
        order: s.order,
        pickupTime: s.pickupTime,
      })),
      assignmentCount: r._count.assignments,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
