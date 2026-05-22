import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  children: ReactNode;
}

/**
 * Shared layout for every transactional email. Plain-text + indigo accent.
 * Keep it minimal — gmail and outlook strip most CSS anyway.
 */
export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Section>
            <Text style={brandStyle}>École SaaS</Text>
          </Section>
          {children}
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Cet email a été envoyé automatiquement par École SaaS. Si vous n&apos;êtes
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
  padding: '32px 24px',
  maxWidth: '560px',
  borderRadius: '8px',
};

const brandStyle = {
  fontSize: '20px',
  fontWeight: 600,
  color: '#4f46e5',
  margin: 0,
  marginBottom: '16px',
};

const hrStyle = {
  borderColor: '#e2e8f0',
  margin: '32px 0 16px',
};

const footerStyle = {
  fontSize: '12px',
  color: '#64748b',
  lineHeight: '18px',
  margin: 0,
};

export const ctaButtonStyle = {
  backgroundColor: '#4f46e5',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 600,
  textDecoration: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  display: 'inline-block',
};

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
