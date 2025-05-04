// Force dynamic rendering to bypass prerendering errors
export const dynamic = "force-dynamic"

// Import the client component
import RecentlyAddedClient from "./client"

export default function RecentlyAddedPage() {
  // Server component that just renders the client component
  return <RecentlyAddedClient />
}
