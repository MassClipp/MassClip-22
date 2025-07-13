"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { auth } from "@/firebase/firebase"

export default function PurchaseSuccessPage() {
  const searchParams = useSearchParams()
  const productBoxId = searchParams.get("productBoxId")
  const creatorId = searchParams.get("creatorId")

  const [purchaseData, setPurchaseData] = useState<any>(null)
  const [accessGranted, setAccessGranted] = useState(false)
  const [isGrantingAccess, setIsGrantingAccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add this function to handle authenticated requests
  const grantAccessWithAuth = async (productBoxId: string, creatorId?: string) => {
    try {
      setIsGrantingAccess(true)

      // Get the current user's ID token
      const user = auth.currentUser
      const headers: any = {
        "Content-Type": "application/json",
      }

      if (user) {
        const idToken = await user.getIdToken()
        headers["Authorization"] = `Bearer ${idToken}`
        console.log("🔐 [Purchase Success] Including auth token in request")
      } else {
        console.log("⚠️ [Purchase Success] No authenticated user found")
      }

      const response = await fetch("/api/purchase/verify-and-grant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          productBoxId,
          creatorId,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setPurchaseData(data.purchase)
        setAccessGranted(true)
        console.log("✅ [Purchase Success] Access granted successfully")
      } else {
        throw new Error(data.error || "Failed to grant access")
      }
    } catch (error) {
      console.error("❌ [Purchase Success] Error granting access:", error)
      setError("Failed to grant access to your purchase")
    } finally {
      setIsGrantingAccess(false)
    }
  }

  // Update the useEffect to use the new function
  useEffect(() => {
    const handleAccessGrant = async () => {
      if (productBoxId && !accessGranted && !isGrantingAccess) {
        await grantAccessWithAuth(productBoxId, creatorId)
      }
    }

    handleAccessGrant()
  }, [productBoxId, creatorId, accessGranted, isGrantingAccess])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Purchase Failed</h1>
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!accessGranted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Verifying Purchase...</h1>
        <p>Please wait while we verify your purchase and grant you access.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Purchase Successful!</h1>
      <p>You now have access to your purchased content.</p>
      {purchaseData && (
        <div>
          <p>Purchase ID: {purchaseData.id}</p>
          {/* Display other relevant purchase information */}
        </div>
      )}
    </div>
  )
}
