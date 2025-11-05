"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { getPlanFeatures, getPlanDisplayName, isUnlimitedPlan } from "@/lib/plan-config"

export function useUserPlan() {
  const { user } = useAuth()
  const [planData, setPlanData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlan() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch("/api/membership-status")
        const data = await response.json()

        console.log("[v0] useUserPlan - Fetched plan data:", data)
        setPlanData(data)
      } catch (error) {
        console.error("[v0] useUserPlan - Error fetching plan:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [user])

  const plan = planData?.plan || "free"
  const features = getPlanFeatures(plan)
  const displayName = getPlanDisplayName(plan)
  const isUnlimited = isUnlimitedPlan(plan)

  return {
    plan,
    displayName,
    features,
    isProUser: isUnlimited, // Only creator_pro is considered "pro" with unlimited features
    isActive: planData?.isActive || false,
    status: planData?.status,
    cancelAtPeriodEnd: planData?.cancelAtPeriodEnd,
    currentPeriodEnd: planData?.currentPeriodEnd,
    loading,
  }
}
