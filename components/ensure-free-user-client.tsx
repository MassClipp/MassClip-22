"use client"

import { useEffect, useRef, useState } from "react"

// Minimal Firebase client init (safe to coexist with your existing init)
import { initializeApp, getApps } from "firebase/app"
import { getAuth, onAuthStateChanged } from "firebase/auth"

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]!
    : initializeApp({
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
      })

const auth = getAuth(firebaseApp)

/**
 * Mount this anywhere in your app (e.g., in app/layout.tsx) so that after a user signs in,
 * we immediately ensure they have a freeUsers document unless they are active Creator Pro.
 */
export default function EnsureFreeUserClient() {
  const lastEnsuredUid = useRef<string | null>(null)
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return
      if (lastEnsuredUid.current === user.uid) return // only once per session

      try {
        setStatus("pending")
        const token = await user.getIdToken(/* forceRefresh */ false)
        const res = await fetch("/api/user/tracking/ensure-free-user", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          console.warn("⚠️ ensure-free-user failed", body)
          setStatus("error")
          return
        }

        const body = await res.json()
        if (body?.success) {
          lastEnsuredUid.current = user.uid
          setStatus("done")
        } else {
          setStatus("error")
        }
      } catch (e) {
        console.error("❌ ensure-free-user error:", e)
        setStatus("error")
      }
    })

    return () => unsub()
  }, [])

  // This component renders nothing; it just runs the side-effect.
  return null
}
