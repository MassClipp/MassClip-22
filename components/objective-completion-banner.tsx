"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useObjectives } from "@/hooks/use-objectives"
import { completeObjective } from "@/lib/objectives-service"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"
import { Sparkles } from "lucide-react"

interface ObjectiveCompletionBannerProps {
  objectiveId: string
  title: string
  instructions: string
  actionLabel?: string
  actionHref?: string
}

export function ObjectiveCompletionBanner({
  objectiveId,
  title,
  instructions,
  actionLabel,
  actionHref,
}: ObjectiveCompletionBannerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { refreshObjectives } = useObjectives()
  const [isCompleting, setIsCompleting] = useState(false)
  const [isChecked, setIsChecked] = useState(false)

  const handleCheckboxChange = async (checked: boolean) => {
    if (!user || !checked) return

    setIsChecked(true)
    setIsCompleting(true)

    try {
      const result = await completeObjective(user.uid, objectiveId)

      if (result.success) {
        await refreshObjectives()

        if (result.allComplete) {
          toast({
            title: "🎉 All Objectives Complete!",
            description: "You've completed all onboarding objectives. Great job!",
            duration: 5000,
          })
        } else if (result.nextObjective) {
          const nextObjectiveMapping: Record<string, { title: string; path: string }> = {
            upload_content: { title: "Upload First Content", path: "/dashboard/upload" },
            add_free_content: { title: "Add Free Content", path: "/dashboard/free-content" },
            connect_stripe: { title: "Connect Stripe", path: "/dashboard/earnings" },
            create_bundle: { title: "Create First Bundle", path: "/dashboard/bundles" },
            go_live: { title: "Go Live", path: "/dashboard/view-storefront" },
          }

          const nextInfo = nextObjectiveMapping[result.nextObjective.id]
          if (nextInfo) {
            toast({
              title: `✨ Next: ${nextInfo.title}`,
              description: result.nextObjective.description,
              duration: 6000,
            })
          }
        }
      }
    } catch (error) {
      console.error("[ObjectiveCompletionBanner] Error completing objective:", error)
      toast({
        title: "Error",
        description: "Failed to complete objective. Please try again.",
        variant: "destructive",
      })
      setIsChecked(false)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/20 rounded-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">{title}</h3>
          </div>
          <p className="text-xs text-white/70 mb-3">{instructions}</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`objective-${objectiveId}`}
                checked={isChecked}
                onCheckedChange={handleCheckboxChange}
                disabled={isCompleting}
                className="border-teal-400/50 data-[state=checked]:bg-teal-400 data-[state=checked]:border-teal-400"
              />
              <label htmlFor={`objective-${objectiveId}`} className="text-xs text-white/80 cursor-pointer select-none">
                Mark as complete
              </label>
            </div>
          </div>
        </div>
        {actionLabel && actionHref && (
          <Button
            onClick={() => router.push(actionHref)}
            size="sm"
            className="bg-gradient-to-r from-teal-400 to-cyan-400 text-black hover:from-teal-500 hover:to-cyan-500 font-medium shrink-0"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  )
}
