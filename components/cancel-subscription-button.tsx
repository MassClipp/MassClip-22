"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"

export default function CancelSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const { user } = useAuth()

  const handleCancel = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to cancel your subscription",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.uid,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to cancel subscription")
      }

      toast({
        title: "Subscription Canceled",
        description:
          "Your subscription has been canceled successfully. You'll have access until the end of your billing period.",
      })

      setIsOpen(false)
      // Refresh the page to update UI
      router.refresh()
    } catch (error) {
      console.error("Error canceling subscription:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button className="vault-button inline-block">
          <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
            Cancel Subscription
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle>Cancel Your Subscription</DialogTitle>
          <DialogDescription className="text-gray-400">
            Are you sure you want to cancel your Pro subscription?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-2">What happens when you cancel:</p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
            <li>Your subscription will remain active until the end of your current billing period</li>
            <li>You'll lose access to Pro features after that date</li>
            <li>You can resubscribe at any time</li>
            <li>No refunds are provided for partial months</li>
          </ul>
        </div>
        <DialogFooter>
          <button onClick={() => setIsOpen(false)} className="vault-button inline-block">
            <span className="relative block px-6 py-2 text-white font-light border border-gray-700 transition-colors duration-300">
              Keep Subscription
            </span>
          </button>
          <button onClick={handleCancel} disabled={isLoading} className="vault-button inline-block">
            <span className="relative block px-6 py-2 text-white font-light border border-crimson transition-colors duration-300">
              {isLoading ? "Canceling..." : "Confirm Cancellation"}
            </span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
