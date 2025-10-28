"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Loader2 } from "lucide-react"

interface StorefrontLiveToggleProps {
  userId: string
  isLive: boolean
  isProUser: boolean
  onTrialOrSubscription: boolean
}

export function StorefrontLiveToggle({ userId, isLive, isProUser, onTrialOrSubscription }: StorefrontLiveToggleProps) {
  const [isToggling, setIsToggling] = useState(false)
  const [liveStatus, setLiveStatus] = useState(isLive)
  const router = useRouter()
  const { toast } = useToast()

  const handleToggle = async (checked: boolean) => {
    // Check if user has access
    if (!isProUser && !onTrialOrSubscription) {
      toast({
        title: "Upgrade Required",
        description: "You need an active subscription or trial to make your storefront live",
        variant: "destructive",
      })
      router.push("/dashboard/upgrade")
      return
    }

    try {
      setIsToggling(true)

      // Update Firestore
      const userDocRef = doc(db, "users", userId)
      await updateDoc(userDocRef, {
        isStorefrontLive: checked,
        storefrontLiveUpdatedAt: new Date(),
      })

      setLiveStatus(checked)

      toast({
        title: checked ? "Storefront is Live!" : "Storefront is Offline",
        description: checked
          ? "Your storefront is now visible to the public"
          : "Your storefront is now hidden from the public",
      })
    } catch (error) {
      console.error("[v0] Error toggling storefront status:", error)
      toast({
        title: "Error",
        description: "Failed to update storefront status",
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-2">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">Storefront Status</span>
        <span className="text-xs text-zinc-400">{liveStatus ? "Live" : "Offline"}</span>
      </div>
      <div className="flex items-center gap-2">
        {isToggling && <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />}
        <Switch
          checked={liveStatus}
          onCheckedChange={handleToggle}
          disabled={isToggling}
          className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-zinc-700"
        />
      </div>
    </div>
  )
}
