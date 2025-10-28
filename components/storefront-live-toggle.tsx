"use client"

import { useState, useEffect } from "react"
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

  useEffect(() => {
    setLiveStatus(isLive)
  }, [isLive])

  const handleToggle = async (checked: boolean) => {
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

      console.log("[v0] Toggling storefront status to:", checked)

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

      console.log("[v0] Storefront status updated successfully")
    } catch (error) {
      console.error("[v0] Error toggling storefront status:", error)
      toast({
        title: "Error",
        description: "Failed to update storefront status",
        variant: "destructive",
      })
      setLiveStatus(!checked)
    } finally {
      setIsToggling(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 rounded-lg px-4 py-2.5 shadow-lg">
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white">Go Live</span>
        <span className="text-xs text-zinc-400">{liveStatus ? "Storefront is live" : "Storefront offline"}</span>
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
