import { Button, Section, Text } from '@react-email/components';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface ExportReadyEmailProps {
  firstName: string;
  /** Pre-signed Cloudflare R2 URL to download the export archive */
  downloadUrl: string;
  /** ISO 8601 timestamp at which the signed URL expires */
  expiresAtIso: string;
}

function formatFrenchDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Paris',
    });
  } catch {
    return iso;
  }
}

export function ExportReadyEmail({
  firstName,
  downloadUrl,
  expiresAtIso,
}: ExportReadyEmailProps) {
  const expiresHuman = formatFrenchDateTime(expiresAtIso);
  return (
    <EmailLayout preview="Votre export de données École SaaS est prêt">
      <Text style={bodyTextStyle}>Bonjour {firstName},</Text>
      <Text style={bodyTextStyle}>
        Votre export de données personnelles (RGPD) est prêt. Cliquez sur le bouton
        ci-dessous pour le télécharger. Le lien est valable jusqu&apos;au {expiresHuman}.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={downloadUrl} style={ctaButtonStyle}>
          Télécharger mes données
        </Button>
      </Section>
      <Text style={bodyTextStyle}>
        Le fichier ZIP contient l&apos;ensemble de vos informations stockées par École
        SaaS (profil, classes, messages, factures, journaux d&apos;activité).
      </Text>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{downloadUrl}</Text>
    </EmailLayout>
  );
}

export default ExportReadyEmail;
