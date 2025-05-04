import ClientWrapper from "./client-wrapper"

// This directive tells Next.js to always render this page dynamically
export const dynamic = "force-dynamic"

export default function BrowseAllPage() {
  return <ClientWrapper />
}
