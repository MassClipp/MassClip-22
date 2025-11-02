"use client"

import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface UpgradePromptProps {
  title: string
  description: string
  buttonText: string
}

export default function UpgradePrompt({ title, description, buttonText }: UpgradePromptProps) {
  const router = useRouter()

  return (
    <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800/50 rounded-xl p-8 text-center max-w-2xl mx-auto">
      <div className="flex justify-center mb-4">
        <div className="p-3 bg-crimson/10 rounded-full">
          <Lock className="h-8 w-8 text-crimson" />
        </div>
      </div>
      <h2 className="text-2xl font-light mb-3">{title}</h2>
      <p className="text-zinc-400 mb-6">{description}</p>
      <Button onClick={() => router.push("/pricing")} className="bg-crimson hover:bg-crimson/90 text-white px-6 py-2">
        {buttonText}
      </Button>
    </div>
  )
}
