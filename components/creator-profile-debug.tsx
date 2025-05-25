"use client"

import { useAuth } from "@/contexts/auth-context"

interface Creator {
  uid: string
  username: string
  displayName: string
  bio: string
  profilePic: string
  createdAt: string
  socialLinks?: {
    instagram?: string
    twitter?: string
    website?: string
  }
  premiumEnabled?: boolean
  premiumPrice?: number
  stripePriceId?: string
  paymentMode?: "one-time" | "subscription"
}

export default function CreatorProfileDebug({ creator }: { creator: Creator }) {
  const { user } = useAuth()
  const isOwner = user && user.uid === creator.uid

  return (
    <div className="fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 text-xs text-white max-w-sm z-50">
      <h3 className="font-bold mb-2">Debug Info</h3>
      <div className="space-y-1">
        <p>Premium Enabled: {creator.premiumEnabled ? "Yes" : "No"}</p>
        <p>Stripe Price ID: {creator.stripePriceId || "Not set"}</p>
        <p>Premium Price: ${creator.premiumPrice || 0}</p>
        <p>Is Owner: {isOwner ? "Yes" : "No"}</p>
        <p>Current User: {user?.email || "Not logged in"}</p>
        <p>Show Button: {creator.premiumEnabled && creator.stripePriceId && !isOwner ? "Yes" : "No"}</p>
      </div>
    </div>
  )
}
