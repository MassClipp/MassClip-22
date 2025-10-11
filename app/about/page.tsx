import type { Metadata } from "next"
import AboutPageClient from "./AboutPageClient"

export const metadata: Metadata = {
  title: "About Vex AI - Your AI Content Assistant",
  description:
    "Learn about Vex AI, the intelligent assistant that helps creators organize, package, and sell content tools and resources. Discover how Vex analyzes your content and creates sellable bundles in seconds.",
  keywords: [
    "about vex ai",
    "AI content assistant",
    "content organization AI",
    "creator tools platform",
    "content monetization",
    "AI bundling assistant",
  ],
  openGraph: {
    title: "About Vex AI - Your AI Content Assistant",
    description:
      "Learn about Vex AI and how it helps creators organize and sell content tools and resources with intelligent AI analysis.",
    url: "https://massclip.pro/about",
    siteName: "Vex AI",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "About Vex AI - AI Content Assistant",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Vex AI - Your AI Content Assistant",
    description:
      "Learn about Vex AI and how it helps creators organize and sell content tools and resources with intelligent AI analysis.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://massclip.pro/about",
  },
}

export default function AboutPage() {
  return <AboutPageClient />
}
