"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface PurchaseAccess {
  hasAccess: boolean
  loading: boolean
  purchaseData: any | null
  error: string | null
}

export function usePurchaseAccess(productBoxId: string): PurchaseAccess {
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [purchaseData, setPurchaseData] = useState(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      if (!user || !productBoxId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        console.log(`🔍 Checking access for user ${user.uid}, product ${productBoxId}`)

        // Check if user has purchased this product box
        const purchaseRef = doc(db, "users", user.uid, "purchases", productBoxId)
        const purchaseDoc = await getDoc(purchaseRef)

        if (purchaseDoc.exists()) {
          const data = purchaseDoc.data()
          console.log("✅ Purchase found:", data)

          if (data.status === "complete") {
            setHasAccess(true)
            setPurchaseData(data)
          } else {
            setHasAccess(false)
            setError(`Purchase status: ${data.status}`)
          }
        } else {
          console.log("❌ No purchase found")
          setHasAccess(false)
        }
      } catch (err) {
        console.error("❌ Error checking purchase access:", err)
        setError("Failed to check access")
        setHasAccess(false)
      } finally {
        setLoading(false)
      }
    }

    checkAccess()
  }, [user, productBoxId])

  return { hasAccess, loading, purchaseData, error }
}
