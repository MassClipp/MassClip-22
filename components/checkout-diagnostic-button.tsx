"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"

interface CheckoutDiagnosticButtonProps {
  productBoxId: string
}

export default function CheckoutDiagnosticButton({ productBoxId }: CheckoutDiagnosticButtonProps) {
  const [testing, setTesting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  const runDiagnostic = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to run diagnostic",
        variant: "destructive",
      })
      return
    }

    setTesting(true)

    try {
      const idToken = await user.getIdToken(true)

      const response = await fetch("/api/debug/test-checkout-simple", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idToken,
          productBoxId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "✅ Diagnostic Passed",
          description: "All checkout components are working correctly!",
        })
        console.log("🎉 [Diagnostic] All tests passed:", result)
      } else {
        toast({
          title: `❌ Failed at: ${result.step}`,
          description: result.error,
          variant: "destructive",
        })
        console.error("❌ [Diagnostic] Failed:", result)
      }
    } catch (error) {
      toast({
        title: "Diagnostic Error",
        description: error.message,
        variant: "destructive",
      })
      console.error("❌ [Diagnostic] Error:", error)
    } finally {
      setTesting(false)
    }
  }

  return (
    <Button onClick={runDiagnostic} disabled={testing} variant="outline" size="sm" className="text-xs">
      {testing ? "Testing..." : "🔧 Test Checkout"}
    </Button>
  )
}
