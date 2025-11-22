import { LandingContentPack } from "@/components/landing-content-pack"
import type { Metadata } from "next"

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
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-7xl">
        <LandingContentPack />
      </div>
    </div>
  )
}
