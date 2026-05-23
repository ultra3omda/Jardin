import { Button, Section, Text } from '@react-email/components';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface InviteEmailProps {
  /** Display name of the super_admin who minted the invite */
  inviterName: string;
  /** Absolute URL pointing at /register?token=… */
  registerUrl: string;
  /** Number of days until the invite expires (passed for display) */
  expiresInDays: number;
  /** V1.6 — tenant branding (optional, defaults to indigo).
   *  NOTE: invites are minted BEFORE the tenant exists, so this is typically
   *  the DEFAULT_BRAND. Kept for API consistency with other templates. */
  brand?: TenantBrand;
  /** V1.6 — tenant display name (defaults to "École SaaS"). */
  tenantName?: string;
}

export function InviteEmail({
  inviterName,
  registerUrl,
  expiresInDays,
  brand,
  tenantName,
}: InviteEmailProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  return (
    <EmailLayout
      preview={`Vous êtes invité(e) à créer un compte ${name}`}
      brand={b}
      tenantName={name}
    >
      <Text style={bodyTextStyle}>Bonjour,</Text>
      <Text style={bodyTextStyle}>
        {inviterName} vous invite à créer un établissement sur {name}. Cliquez
        sur le bouton ci-dessous pour finaliser votre inscription. Ce lien expire
        dans {expiresInDays} jour{expiresInDays > 1 ? 's' : ''}.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={registerUrl} style={ctaButtonStyle(b)}>
          Créer mon compte
        </Button>
      </Section>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{registerUrl}</Text>
    </EmailLayout>
  );
}

export default InviteEmail;
