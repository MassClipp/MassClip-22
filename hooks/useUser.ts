"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { auth } from "@/firebase/config"
import { onAuthStateChanged } from "firebase/auth"

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return { user, loading }
}
