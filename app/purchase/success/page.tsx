"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function PurchaseSuccessRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the new payment success page
    const currentUrl = window.location.href
    const newUrl = currentUrl.replace("/purchase/success", "/payment-success")

    console.log(`🔄 [Redirect] Old URL: ${currentUrl}`)
    console.log(`🔄 [Redirect] New URL: ${newUrl}`)

    // Use replace to avoid adding to browser history
    window.location.replace(newUrl)
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to payment verification...</p>
      </div>
    </div>
  )
}
