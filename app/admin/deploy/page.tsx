/**
 * Server Component wrapper for the deploy admin page.
 * It imports a Client Component (DeploymentAdminWrapper) which itself
 * handles dynamic loading and disables SSR.
 */

import DeploymentAdminWrapper from "./DeploymentAdminWrapper"

export const dynamic = "force-dynamic"

export default function DeploymentAdminPage() {
  return <DeploymentAdminWrapper />
}
