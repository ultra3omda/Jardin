/**
 * V1.6 — Path-based pre-auth tenant route. The parent layout
 * (auth)/t/[slug]/layout.tsx already injected the brand CSS vars +
 * favicon, so this thin wrapper just delegates to the V1.5 login UI.
 * The login form's manual `tenantSlug` input still works for users
 * who reach here unintentionally.
 */
import LoginPage from '@/app/[locale]/(auth)/login/page';
export default LoginPage;
