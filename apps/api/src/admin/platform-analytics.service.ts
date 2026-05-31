import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { deriveDemoRequests, isPendingDemo, MAX_DEMO_AUDIT_ROWS } from '../demo-requests/demo-status.util';
import { AnalyticsDto, CategoryCountDto, GrowthPointDto, OverviewDto } from './dto/platform.dto';

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildGrowth(dates: Date[]): GrowthPointDto[] {
  const byMonth = new Map<string, number>();
  for (const date of dates) {
    const key = monthKey(date);
    byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
  }
  const months = [...byMonth.keys()].sort();
  let cumulative = 0;
  return months.map((month) => {
    const newTenants = byMonth.get(month) ?? 0;
    cumulative += newTenants;
    return { month, newTenants, cumulativeTenants: cumulative };
  });
}

function countBy(values: Array<string | null>): CategoryCountDto[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value ?? 'inconnu';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

@Injectable()
export class PlatformAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<OverviewDto> {
    const [tenants, users, students, requested, statuses, activeSubs] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.student.count({ where: { deletedAt: null } }),
      this.prisma.auditLog.findMany({
        where: { action: 'demo.requested' },
        orderBy: { createdAt: 'desc' },
        take: MAX_DEMO_AUDIT_ROWS,
      }),
      this.prisma.auditLog.findMany({
        where: { action: 'demo.status_changed' },
        orderBy: { createdAt: 'desc' },
        take: MAX_DEMO_AUDIT_ROWS,
      }),
      this.prisma.tenantSubscription.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: { select: { price: true, interval: true } } },
      }),
    ]);
    const pendingDemoRequests = deriveDemoRequests(requested, statuses).filter((r) =>
      isPendingDemo(r.status),
    ).length;

    // MRR: monthly plans count at face value; yearly plans normalised to /12.
    let mrr = new Prisma.Decimal(0);
    for (const sub of activeSubs) {
      const price = sub.plan.price;
      mrr = mrr.add(sub.plan.interval === 'YEARLY' ? price.div(12) : price);
    }
    const mrrRounded = mrr.toDecimalPlaces(3);

    return {
      tenants,
      users,
      students,
      pendingDemoRequests,
      activeSubscriptions: activeSubs.length,
      mrr: mrrRounded.toString(),
      arr: mrrRounded.mul(12).toDecimalPlaces(3).toString(),
      currency: 'TND',
    };
  }

  async analytics(): Promise<AnalyticsDto> {
    const [tenants, users] = await Promise.all([
      this.prisma.tenant.findMany({ where: { deletedAt: null }, select: { createdAt: true, type: true, locale: true } }),
      this.prisma.user.findMany({ where: { deletedAt: null }, select: { role: true } }),
    ]);
    return {
      tenantGrowth: buildGrowth(tenants.map((t) => t.createdAt)),
      tenantsByType: countBy(tenants.map((t) => t.type)),
      tenantsByLocale: countBy(tenants.map((t) => t.locale)),
      usersByRole: countBy(users.map((u) => u.role)),
    };
  }
}
