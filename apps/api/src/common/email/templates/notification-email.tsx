import { Button, Section, Text } from '@react-email/components';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export type NotificationEmailType =
  | 'MESSAGE'
  | 'GRADE'
  | 'ATTENDANCE'
  | 'INVOICE'
  | 'ANNOUNCEMENT'
  | 'SYSTEM'
  | 'PAYMENT_REMINDER'
  | 'OBSERVATION';

export interface NotificationEmailProps {
  /** Notification headline, e.g. "Nouveau message de Mme Martin" */
  title: string;
  /** Body paragraph */
  body: string;
  /** Optional call-to-action label, e.g. "Voir le message" */
  ctaLabel?: string;
  /** Optional absolute URL the CTA points to */
  ctaUrl?: string;
  /** Notification type — drives the small eyebrow label */
  notificationType?: NotificationEmailType;
  /** Recipient display name for the greeting (optional) */
  recipientName?: string;
  /** Tenant branding (optional, defaults to Klasso terracotta). */
  brand?: TenantBrand;
  /** Tenant display name (defaults to "École SaaS"). */
  tenantName?: string;
}

/** Human-readable French eyebrow label per notification type. */
const TYPE_LABELS: Record<NotificationEmailType, string> = {
  MESSAGE: 'Message',
  GRADE: 'Note',
  ATTENDANCE: 'Présence',
  INVOICE: 'Facture',
  ANNOUNCEMENT: 'Annonce',
  SYSTEM: 'Notification',
  PAYMENT_REMINDER: 'Rappel de paiement',
  OBSERVATION: 'Observation',
};

/**
 * V10 — Generic transactional template for business-event notifications
 * (message, grade, absence, invoice, announcement). Brand-aware via the
 * shared {@link EmailLayout}; falls back to the default Klasso palette.
 */
export function NotificationEmail({
  title,
  body,
  ctaLabel,
  ctaUrl,
  notificationType = 'SYSTEM',
  recipientName,
  brand,
  tenantName,
}: NotificationEmailProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  const eyebrow = TYPE_LABELS[notificationType] ?? TYPE_LABELS.SYSTEM;
  const hasCta = Boolean(ctaLabel && ctaUrl);

  return (
    <EmailLayout preview={title} brand={b} tenantName={name}>
      <Text style={{ ...eyebrowStyle, color: b.primaryColor }}>{eyebrow.toUpperCase()}</Text>
      <Text style={titleStyle}>{title}</Text>
      {recipientName ? (
        <Text style={bodyTextStyle}>Bonjour {recipientName},</Text>
      ) : null}
      <Text style={bodyTextStyle}>{body}</Text>
      {hasCta ? (
        <>
          <Section style={{ margin: '24px 0' }}>
            <Button href={ctaUrl} style={ctaButtonStyle(b)}>
              {ctaLabel}
            </Button>
          </Section>
          <Text style={bodyTextStyle}>
            Ou copiez-collez ce lien dans votre navigateur :
          </Text>
          <Text style={fallbackUrlStyle}>{ctaUrl}</Text>
        </>
      ) : null}
    </EmailLayout>
  );
}

const eyebrowStyle = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  margin: '0 0 4px',
};

const titleStyle = {
  fontSize: '20px',
  fontWeight: 700,
  lineHeight: '28px',
  color: '#0f172a',
  margin: '0 0 16px',
};

export default NotificationEmail;
