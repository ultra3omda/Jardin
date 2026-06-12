import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import { CashSessionStatus } from '@prisma/client';

import { PrismaService } from '../common/prisma/prisma.service';
import { AddMovementDto, CloseSessionDto, OpenSessionDto } from './dto/cash-register.dto';
import { computeExpected, computeVariance, Movement } from './cash-register.util';

/**
 * G1 — Caisse journalière : ouverture, mouvements, clôture avec calcul d'écart.
 * Une seule session OPEN par tenant à la fois.
 */
@Injectable()
export class CashRegisterService {
  constructor(private readonly prisma: PrismaService) {}

  async open(tenantId: string, userId: string, dto: OpenSessionDto) {
    const existing = await this.prisma.cashRegisterSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
    });
    if (existing) throw new ConflictException('A cash session is already open');
    return this.prisma.cashRegisterSession.create({
      data: {
        id: createId(),
        tenantId,
        openedById: userId,
        openingFloat: dto.openingFloat,
        notes: dto.notes,
        status: CashSessionStatus.OPEN,
      },
    });
  }

  async current(tenantId: string) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { tenantId, status: CashSessionStatus.OPEN },
      include: { movements: true },
    });
    if (!session) return null;
    const movements: Movement[] = session.movements.map((m) => ({
      kind: m.kind,
      amount: Number(m.amount),
    }));
    return { ...session, liveExpected: computeExpected(Number(session.openingFloat), movements) };
  }

  async addMovement(
    tenantId: string,
    userId: string,
    sessionId: string,
    dto: AddMovementDto,
  ) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, tenantId, status: CashSessionStatus.OPEN },
    });
    if (!session) throw new NotFoundException('Open session not found');
    return this.prisma.cashMovement.create({
      data: {
        id: createId(),
        tenantId,
        sessionId,
        kind: dto.kind,
        amount: dto.amount,
        label: dto.label,
        createdById: userId,
      },
    });
  }

  async close(tenantId: string, userId: string, sessionId: string, dto: CloseSessionDto) {
    const session = await this.prisma.cashRegisterSession.findFirst({
      where: { id: sessionId, tenantId, status: CashSessionStatus.OPEN },
      include: { movements: true },
    });
    if (!session) throw new NotFoundException('Open session not found');
    const movements: Movement[] = session.movements.map((m) => ({
      kind: m.kind,
      amount: Number(m.amount),
    }));
    const expected = computeExpected(Number(session.openingFloat), movements);
    const variance = computeVariance(expected, dto.countedAmount);
    return this.prisma.cashRegisterSession.update({
      where: { id: sessionId },
      data: {
        status: CashSessionStatus.CLOSED,
        closedById: userId,
        closedAt: new Date(),
        countedAmount: dto.countedAmount,
        expectedAmount: expected,
        variance,
        notes: dto.notes ?? session.notes,
      },
    });
  }

  closures(tenantId: string) {
    return this.prisma.cashRegisterSession.findMany({
      where: { tenantId, status: CashSessionStatus.CLOSED },
      orderBy: { closedAt: 'desc' },
      take: 100,
    });
  }
}
