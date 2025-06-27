"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export function useUserPlan() {
  const { user } = useAuth()
  const [plan, setPlan] = useState<string>("creator_pro") // Temporarily default to creator_pro
  const [isProUser, setIsProUser] = useState(true) // Temporarily treat all as pro
  const [loading, setLoading] = useState(false) // Temporarily no loading

  useEffect(() => {
    if (!user) {
      // Temporarily treat even non-authenticated users as pro
      setPlan("creator_pro")
      setIsProUser(true)
      setLoading(false)
      return
    }

    // Temporarily override all users to creator_pro plan
    setPlan("creator_pro")
    setIsProUser(true)
    setLoading(false)

    // Comment out the real-time listener temporarily
    /*
    const unsubscribe = onSnapshot(
      doc(db, "users", user.uid),
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data()
          const userPlan = userData.plan || "free"
          setPlan(userPlan)
          setIsProUser(userPlan === "pro" || userPlan === "creator_pro")
        } else {
          setPlan("free")
          setIsProUser(false)
        }
        setLoading(false)
      },
      (error) => {
        console.error("Error listening to user plan:", error)
        setPlan("free")
        setIsProUser(false)
        setLoading(false)
      }
    )

    return () => unsubscribe()
    */
  }, [user])

  return {
    plan: "creator_pro", // Temporarily always creator_pro
    isProUser: true, // Temporarily always true
    loading: false, // Temporarily no loading
  }
}
