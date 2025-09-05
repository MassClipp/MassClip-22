import type { Metadata } from "next"
import AboutPageClient from "./AboutPageClient"

export const metadata: Metadata = {
  title: "About Us - MassClip",
  description:
    "Learn about MassClip's mission to help faceless creators monetize their content. We provide a simple platform for creators to sell digital content without showing their face.",
  keywords: [
    "about massclip",
    "faceless creator platform",
    "content monetization",
    "digital content marketplace",
    "creator economy",
  ],
  openGraph: {
    title: "About MassClip - The Platform for Faceless Creators",
    description: "Learn about our mission to help faceless creators monetize their content with zero hassle.",
    url: "https://massclip.com/about",
    siteName: "MassClip",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "About MassClip - Faceless Creator Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "About MassClip - The Platform for Faceless Creators",
    description: "Learn about our mission to help faceless creators monetize their content with zero hassle.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://massclip.com/about",
  },
}

export default function AboutPage() {
  return <AboutPageClient />
}
