import type { Metadata } from "next"
import AboutPageClient from "./AboutPageClient"

export const metadata: Metadata = {
  title: "About MassClip - AI-Powered Content Organization Platform",
  description:
    "Learn about MassClip and Vex AI, the intelligent assistant that helps creators organize, package, and sell content tools and resources. Discover how Vex analyzes your content and creates sellable bundles in seconds.",
  keywords: [
    "about massclip",
    "vex ai",
    "AI content assistant",
    "content organization AI",
    "creator tools platform",
    "content monetization",
    "AI bundling assistant",
  ],
  openGraph: {
    title: "About MassClip - AI-Powered Content Organization Platform",
    description:
      "Learn about MassClip and how Vex AI helps creators organize and sell content tools and resources with intelligent AI analysis.",
    url: "https://massclip.pro/about",
    siteName: "MassClip",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "About MassClip - AI Content Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About MassClip - AI-Powered Content Organization Platform",
    description:
      "Learn about MassClip and how Vex AI helps creators organize and sell content tools and resources with intelligent AI analysis.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://massclip.pro/about",
  },
}

export default function AboutPage() {
  return <AboutPageClient />
}
