import type { Metadata } from "next"
import ClientContentPackPage from "./client-page"

export const metadata: Metadata = {
  title: "150+ High Quality Motivational Clips | Quick Content Boost",
  description:
    "Get instant access to 150+ high quality motivational clips. Perfect for theme pages and content creators. Start selling or posting today!",
  openGraph: {
    title: "150+ High Quality Motivational Clips | Quick Content Boost",
    description:
      "Get instant access to 150+ high quality motivational clips. Perfect for theme pages and content creators.",
    type: "website",
  },
}

export default function ContentPackLandingPage() {
  return <ClientContentPackPage />
}
