import { Redirect } from 'expo-router';

/**
 * Boot router — Phase B (minimal).
 * Phase C l'enrichira avec la logique auth + tenantSlug.
 */
export default function Index() {
  // En Phase B : toujours envoyer vers onboarding pour test visuel
  return <Redirect href="/(onboarding)/school-code" />;
}
