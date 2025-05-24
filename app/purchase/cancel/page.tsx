"use client"

import { useRouter } from "next/navigation"
import { XCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PurchaseCancelPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-4">
      <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mb-8">
        <XCircle className="h-10 w-10 text-amber-500" />
      </div>

      <h1 className="text-3xl font-bold mb-2">Purchase Cancelled</h1>

      <p className="text-zinc-400 text-center max-w-md mb-8">
        Your purchase has been cancelled. No charges have been made to your account.
      </p>

      <Button
        onClick={() => router.back()}
        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Go Back
      </Button>
    </div>
  )
}
