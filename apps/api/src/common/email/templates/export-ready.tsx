import { Button, Section, Text } from '@react-email/components';
import { DEFAULT_BRAND, type TenantBrand } from '@ecole-saas/shared';

import { EmailLayout, bodyTextStyle, ctaButtonStyle, fallbackUrlStyle } from './layout';

export interface ExportReadyEmailProps {
  firstName: string;
  /** Pre-signed Cloudflare R2 URL to download the export archive */
  downloadUrl: string;
  /** ISO 8601 timestamp at which the signed URL expires */
  expiresAtIso: string;
  brand?: TenantBrand;
  tenantName?: string;
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
  brand,
  tenantName,
}: ExportReadyEmailProps) {
  const b = brand ?? DEFAULT_BRAND;
  const name = tenantName ?? 'École SaaS';
  const expiresHuman = formatFrenchDateTime(expiresAtIso);
  return (
    <EmailLayout
      preview={`Votre export de données ${name} est prêt`}
      brand={b}
      tenantName={name}
    >
      <Text style={bodyTextStyle}>Bonjour {firstName},</Text>
      <Text style={bodyTextStyle}>
        Votre export de données personnelles (RGPD) est prêt. Cliquez sur le bouton
        ci-dessous pour le télécharger. Le lien est valable jusqu&apos;au {expiresHuman}.
      </Text>
      <Section style={{ margin: '24px 0' }}>
        <Button href={downloadUrl} style={ctaButtonStyle(b)}>
          Télécharger mes données
        </Button>
      </Section>
      <Text style={bodyTextStyle}>
        Le fichier ZIP contient l&apos;ensemble de vos informations stockées par {name}
        (profil, classes, messages, factures, journaux d&apos;activité).
      </Text>
      <Text style={bodyTextStyle}>Ou copiez-collez ce lien dans votre navigateur :</Text>
      <Text style={fallbackUrlStyle}>{downloadUrl}</Text>
    </EmailLayout>
  );
}

export default ExportReadyEmail;
