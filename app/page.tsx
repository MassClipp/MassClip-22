import { LandingPageClient } from "@/components/landing-page-client"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "MassClip - Organize & Sell Content with AI",
  description:
    "MassClip's AI assistant Vex helps you organize content, create bundles, and sell to other creators. Upload your clips, templates, and resources—let Vex handle the rest.",
}

export default function LandingPage() {
  return <LandingPageClient />
}
