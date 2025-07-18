import type { Metadata } from "next"
import BundlesClientPage from "./BundlesClientPage"

export const metadata: Metadata = {
  title: "My Bundles",
  description: "Manage the bundles you’ve created or purchased.",
}

export default function BundlesPage() {
  return <BundlesClientPage />
}
