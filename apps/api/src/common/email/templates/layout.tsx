import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
  /** Tenant-specific branding. Defaults to indigo / "École SaaS" wordmark. */
  brand?: TenantBrand;
  /** Display name of the tenant. Falls back to "École SaaS". */
  tenantName?: string;
}

/**
 * Shared layout for every transactional email. Plain-text + brand-aware
 * header (logo if Tenant.brand.logoUrl set, else tenant name).
 * Keep it minimal — gmail and outlook strip most CSS anyway.
 *
 * V1.6 — brand + tenantName are optional for backward compatibility.
 * V1.5 callers without those props get the indigo/"École SaaS" defaults.
 */
export function EmailLayout({ preview, children, brand, tenantName }: EmailLayoutProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section style={{ ...headerStyle, backgroundColor: b.emailHeaderColor }}>
            {b.logoUrl ? (
              <Img src={b.logoUrl} alt={name} width="120" style={{ display: 'block' }} />
            ) : (
              <Text style={brandStyle}>{name}</Text>
            )}
          </Section>
          <Section style={{ padding: '24px' }}>{children}</Section>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Cet email a été envoyé automatiquement par {name}. Si vous n&apos;êtes
            pas à l&apos;origine de cette demande, vous pouvez l&apos;ignorer.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: '#f8fafc',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  margin: 0,
  padding: 0,
};

const containerStyle = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  maxWidth: '560px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
};

const headerStyle = {
  padding: '20px 24px',
  textAlign: 'center' as const,
};

const brandStyle = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#ffffff',
  margin: 0,
};

const hrStyle = {
  borderColor: '#e2e8f0',
  margin: '0 24px 16px',
};

const footerStyle = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '18px',
  margin: 0,
  padding: '0 24px 16px',
};

/**
 * V1.6 — CTA button style is now a function of brand so the primary color
 * comes from the tenant. Callers should compute `b = brand ?? DEFAULT_BRAND`
 * once and reuse for every CTA in the same email.
 *
 * Breaking change vs V1.5: was `export const ctaButtonStyle = { ... }`.
 * Templates have been updated accordingly in this same commit.
 */
export function ctaButtonStyle(brand: TenantBrand) {
  return {
    backgroundColor: brand.primaryColor,
    color: '#ffffff',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none' as const,
    padding: '12px 24px',
    borderRadius: '6px',
    display: 'inline-block' as const,
  };
}

export const bodyTextStyle = {
  fontSize: '14px',
  lineHeight: '22px',
  color: '#0f172a',
  margin: '0 0 16px',
};

export const fallbackUrlStyle = {
  fontSize: '12px',
  color: '#64748b',
  wordBreak: 'break-all' as const,
  margin: '8px 0 0',
};
