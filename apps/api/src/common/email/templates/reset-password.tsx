import { Button, Section, Text } from '@react-email/components';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface ResetPasswordEmailProps {
  firstName: string;
  resetUrl: string;
  brand?: TenantBrand;
  tenantName?: string;
}

export function ResetPasswordEmail({
  firstName,
  resetUrl,
  brand,
  tenantName,
}: ResetPasswordEmailProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  return (
    <EmailLayout
      preview={`Réinitialisation de votre mot de passe ${name}`}
      brand={b}
      tenantName={name}
    >
      <Text style={bodyTextStyle}>Bonjour {firstName},</Text>
      <Text style={bodyTextStyle}>
        Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton
        ci-dessous pour en choisir un nouveau. Ce lien expire dans 24 heures.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={resetUrl} style={ctaButtonStyle(b)}>
          Réinitialiser mon mot de passe
        </Button>
      </Section>
      <Text style={bodyTextStyle}>
        Si vous n&apos;êtes pas à l&apos;origine de cette demande, ignorez cet email —
        votre mot de passe actuel reste valide. Toutes vos sessions ouvertes seront
        déconnectées au prochain changement de mot de passe.
      </Text>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{resetUrl}</Text>
    </EmailLayout>
  );
}

export default ResetPasswordEmail;
