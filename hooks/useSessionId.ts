"use client"

import { useState, useEffect } from "react"

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    // Get session ID from localStorage
    const storedSessionId = localStorage.getItem("purchase_session_id")
    setSessionId(storedSessionId)
  }, [])

  const storeSessionId = (id: string) => {
    localStorage.setItem("purchase_session_id", id)
    setSessionId(id)
  }

  const clearSessionId = () => {
    localStorage.removeItem("purchase_session_id")
    setSessionId(null)
  }

  return { sessionId, storeSessionId, clearSessionId }
}
