"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { AlertTriangle } from "lucide-react"

export function CancelSubscriptionButton() {
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
        description: data.message,
      })

      setIsOpen(false)
      setTimeout(() => {
        window.location.reload()
      }, 1000)
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
        <Button
          variant="outline"
          className="border-red-600 text-red-600 hover:bg-red-600 hover:text-white bg-transparent"
        >
          Cancel Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Cancel Your Creator Pro Subscription
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Are you sure you want to cancel your Creator Pro subscription?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="bg-zinc-800/50 p-4 rounded-lg">
            <h4 className="font-medium text-white mb-2">What happens when you cancel:</h4>
            <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-300">
              <li>Your subscription will remain active until the end of your current billing period</li>
              <li>You'll automatically return to the Free plan after that date</li>
              <li>You can resubscribe at any time to regain Creator Pro features</li>
              <li>No refunds are provided for partial billing periods</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Keep Subscription
          </Button>
          <Button onClick={handleCancel} disabled={isLoading} className="bg-red-600 hover:bg-red-700 text-white">
            {isLoading ? "Canceling..." : "Confirm Cancellation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CancelSubscriptionButton
