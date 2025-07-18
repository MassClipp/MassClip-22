import DeploymentAdminWrapper from "./DeploymentAdminWrapper"

// Force dynamic rendering to avoid build-time issues
export const dynamic = "force-dynamic"

export default function DeployPage() {
  return <DeploymentAdminWrapper />
}
