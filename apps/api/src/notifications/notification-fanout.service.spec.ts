import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NotificationFanoutService } from './notification-fanout.service';

/**
 * Opted-in recipient: in-app + email + push all eligible. Individual tests
 * override fields (e.g. emailNotificationsEnabled) to assert channel gating.
 */
const OPTED_IN_USER = {
  email: 'parent@demo.tn',
  firstName: 'Bob',
  expoPushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  pushEnabled: true,
  emailNotificationsEnabled: true,
};

function buildMocks() {
  const notifications = { create: vi.fn().mockResolvedValue(undefined) };
  const resend = { send: vi.fn().mockResolvedValue(undefined) };
  const push = { send: vi.fn().mockResolvedValue(undefined) };
  const prisma = {
    user: { findFirst: vi.fn().mockResolvedValue({ ...OPTED_IN_USER }) },
  };
  // ConfigService.get(key, default) — return a deterministic base URL.
  const config = { get: vi.fn((_key: string, _def?: unknown) => 'https://app.test') };
  return { notifications, resend, push, prisma, config };
}

function buildService(mocks: ReturnType<typeof buildMocks>): NotificationFanoutService {
  return new NotificationFanoutService(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.notifications as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.resend as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.push as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.prisma as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mocks.config as any,
  );
}

describe('NotificationFanoutService', () => {
  let mocks: ReturnType<typeof buildMocks>;
  let service: NotificationFanoutService;

  beforeEach(() => {
    mocks = buildMocks();
    service = buildService(mocks);
  });

  describe('fanoutMessage', () => {
    it('delivers across all three channels for a fully opted-in recipient', async () => {
      await service.fanoutMessage('t1', 'u1', 'Alice', 'conv1');

      expect(mocks.notifications.create).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          userId: 'u1',
          type: 'MESSAGE',
          title: 'Nouveau message de Alice',
          data: { conversationId: 'conv1' },
        }),
      );
      expect(mocks.resend.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'parent@demo.tn', subject: 'Nouveau message de Alice' }),
      );
      expect(mocks.push.send).toHaveBeenCalledWith(
        'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        'Nouveau message de Alice',
        expect.any(String),
        expect.objectContaining({
          type: 'MESSAGE',
          url: 'https://app.test/messages',
          conversationId: 'conv1',
        }),
      );
    });

    it('skips email when emailNotificationsEnabled is false', async () => {
      mocks.prisma.user.findFirst.mockResolvedValue({
        ...OPTED_IN_USER,
        emailNotificationsEnabled: false,
      });

      await service.fanoutMessage('t1', 'u1', 'Alice', 'conv1');

      expect(mocks.notifications.create).toHaveBeenCalledTimes(1);
      expect(mocks.resend.send).not.toHaveBeenCalled();
      expect(mocks.push.send).toHaveBeenCalledTimes(1);
    });

    it('skips push when pushEnabled is false', async () => {
      mocks.prisma.user.findFirst.mockResolvedValue({
        ...OPTED_IN_USER,
        pushEnabled: false,
      });

      await service.fanoutMessage('t1', 'u1', 'Alice', 'conv1');

      expect(mocks.resend.send).toHaveBeenCalledTimes(1);
      expect(mocks.push.send).not.toHaveBeenCalled();
    });

    it('skips push when no expoPushToken is registered', async () => {
      mocks.prisma.user.findFirst.mockResolvedValue({
        ...OPTED_IN_USER,
        expoPushToken: null,
      });

      await service.fanoutMessage('t1', 'u1', 'Alice', 'conv1');

      expect(mocks.push.send).not.toHaveBeenCalled();
    });

    it('still records the in-app notification but skips email/push when recipient is missing', async () => {
      mocks.prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.fanoutMessage('t1', 'u1', 'Alice', 'conv1')).resolves.toBeUndefined();

      expect(mocks.notifications.create).toHaveBeenCalledTimes(1);
      expect(mocks.resend.send).not.toHaveBeenCalled();
      expect(mocks.push.send).not.toHaveBeenCalled();
    });

    it('never rejects when the in-app channel throws (non-blocking contract)', async () => {
      mocks.notifications.create.mockRejectedValue(new Error('db down'));

      await expect(service.fanoutMessage('t1', 'u1', 'Alice', 'conv1')).resolves.toBeUndefined();
      // Failure on the in-app row must not stop the remaining channels.
      expect(mocks.resend.send).toHaveBeenCalledTimes(1);
      expect(mocks.push.send).toHaveBeenCalledTimes(1);
    });

    it('returns early when recipient lookup itself rejects', async () => {
      mocks.prisma.user.findFirst.mockRejectedValue(new Error('connection lost'));

      await expect(service.fanoutMessage('t1', 'u1', 'Alice', 'conv1')).resolves.toBeUndefined();
      expect(mocks.resend.send).not.toHaveBeenCalled();
      expect(mocks.push.send).not.toHaveBeenCalled();
    });
  });

  describe('fanoutGrade', () => {
    it('includes the period suffix in the body when periodName is provided', async () => {
      await service.fanoutGrade('t1', 'u1', 'Lina', 'Mathématiques', 'Trimestre 1');

      expect(mocks.notifications.create).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          type: 'GRADE',
          title: 'Nouvelle note : Mathématiques',
          body: 'Une nouvelle note en Mathématiques a été publiée pour Lina (Trimestre 1).',
        }),
      );
    });

    it('omits the period suffix when periodName is absent', async () => {
      await service.fanoutGrade('t1', 'u1', 'Lina', 'Mathématiques');

      const body = mocks.notifications.create.mock.calls[0][1].body as string;
      expect(body).toBe('Une nouvelle note en Mathématiques a été publiée pour Lina.');
      expect(body).not.toContain('undefined');
      expect(body).not.toContain('(');
    });
  });

  describe('fanoutAbsence', () => {
    it('formats the date (fr-FR) and marks an unjustified absence', async () => {
      await service.fanoutAbsence('t1', 'u1', 'Lina', new Date('2025-10-15T00:00:00Z'), false);

      const body = mocks.notifications.create.mock.calls[0][1].body as string;
      expect(body).toContain('Une absence non justifiée');
      expect(body).toContain('Lina');
      expect(body).toContain('octobre');
      expect(body).toContain('2025');
    });

    it('marks a justified absence without the "non" qualifier', async () => {
      await service.fanoutAbsence('t1', 'u1', 'Lina', '2025-10-15', true);

      const body = mocks.notifications.create.mock.calls[0][1].body as string;
      expect(body).toContain('Une absence justifiée');
      expect(body).not.toContain('non justifiée');
    });
  });

  describe('fanoutInvoice', () => {
    it('formats the amount with two decimals (fr-FR) in the body', async () => {
      await service.fanoutInvoice('t1', 'u1', 'Lina', 150.5);

      expect(mocks.notifications.create).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          type: 'INVOICE',
          title: 'Nouvelle facture',
          body: expect.stringContaining('150,50'),
        }),
      );
    });
  });

  describe('fanoutAnnouncement', () => {
    it('fans out to every recipient in the list', async () => {
      await service.fanoutAnnouncement('t1', ['u1', 'u2', 'u3'], 'Sortie scolaire');

      expect(mocks.notifications.create).toHaveBeenCalledTimes(3);
      expect(mocks.resend.send).toHaveBeenCalledTimes(3);
      expect(mocks.notifications.create).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({
          type: 'ANNOUNCEMENT',
          title: 'Annonce : Sortie scolaire',
        }),
      );
    });

    it('does nothing when the recipient list is empty', async () => {
      await service.fanoutAnnouncement('t1', [], 'Sortie scolaire');

      expect(mocks.notifications.create).not.toHaveBeenCalled();
      expect(mocks.resend.send).not.toHaveBeenCalled();
      expect(mocks.push.send).not.toHaveBeenCalled();
    });
  });
});
