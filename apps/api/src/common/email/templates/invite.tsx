import { Button, Section, Text } from '@react-email/components';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface InviteEmailProps {
  /** Display name of the super_admin who minted the invite */
  inviterName: string;
  /** Absolute URL pointing at /register?token=… */
  registerUrl: string;
  /** Number of days until the invite expires (passed for display) */
  expiresInDays: number;
}

export function InviteEmail({ inviterName, registerUrl, expiresInDays }: InviteEmailProps) {
  return (
    <EmailLayout preview="Vous êtes invité(e) à créer un compte École SaaS">
      <Text style={bodyTextStyle}>Bonjour,</Text>
      <Text style={bodyTextStyle}>
        {inviterName} vous invite à créer un établissement sur École SaaS. Cliquez
        sur le bouton ci-dessous pour finaliser votre inscription. Ce lien expire
        dans {expiresInDays} jour{expiresInDays > 1 ? 's' : ''}.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={registerUrl} style={ctaButtonStyle}>
          Créer mon compte
        </Button>
      </Section>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{registerUrl}</Text>
    </EmailLayout>
  );
}

export default InviteEmail;
