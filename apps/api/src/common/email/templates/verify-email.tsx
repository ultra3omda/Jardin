import { Button, Section, Text } from '@react-email/components';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface VerifyEmailProps {
  firstName: string;
  verifyUrl: string;
}

export function VerifyEmail({ firstName, verifyUrl }: VerifyEmailProps) {
  return (
    <EmailLayout preview="Confirmez votre adresse email pour activer votre compte École SaaS">
      <Text style={bodyTextStyle}>Bonjour {firstName},</Text>
      <Text style={bodyTextStyle}>
        Bienvenue sur École SaaS. Pour activer votre compte et vous connecter,
        cliquez sur le bouton ci-dessous. Ce lien expire dans 48 heures.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={verifyUrl} style={ctaButtonStyle}>
          Confirmer mon email
        </Button>
      </Section>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{verifyUrl}</Text>
    </EmailLayout>
  );
}

export default VerifyEmail;
