"use client"
import dynamic from "next/dynamic"

// Load the original client component only in the browser
const StripeTestClientPage = dynamic(() => import("./StripeTestClientPage"), { ssr: false })

export default function Page() {
  return <StripeTestClientPage />
}

// StripeTestClientPage component can be defined here if needed
