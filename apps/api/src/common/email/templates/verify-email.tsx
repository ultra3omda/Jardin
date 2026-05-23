import { Button, Section, Text } from '@react-email/components';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface VerifyEmailProps {
  firstName: string;
  verifyUrl: string;
  brand?: TenantBrand;
  tenantName?: string;
}

export function VerifyEmail({ firstName, verifyUrl, brand, tenantName }: VerifyEmailProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  return (
    <EmailLayout
      preview={`Confirmez votre adresse email pour activer votre compte ${name}`}
      brand={b}
      tenantName={name}
    >
      <Text style={bodyTextStyle}>Bonjour {firstName},</Text>
      <Text style={bodyTextStyle}>
        Bienvenue sur {name}. Pour activer votre compte et vous connecter,
        cliquez sur le bouton ci-dessous. Ce lien expire dans 48 heures.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={verifyUrl} style={ctaButtonStyle(b)}>
          Confirmer mon email
        </Button>
      </Section>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{verifyUrl}</Text>
    </EmailLayout>
  );
}

export default VerifyEmail;
