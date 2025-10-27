"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle2, Circle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useObjectives } from "@/hooks/use-objectives"
import { dismissObjectivesPopup } from "@/lib/objectives-service"
import { useAuth } from "@/contexts/auth-context"

export function ObjectivesPopup() {
  const { user } = useAuth()
  const { objectives, isLoading } = useObjectives()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Show popup if:
    // 1. User is logged in
    // 2. Objectives are loaded
    // 3. Not all objectives are completed
    // 4. Popup hasn't been dismissed
    if (user && objectives && !isLoading) {
      const shouldShow = objectives.percentageComplete < 100 && !objectives.dismissed
      setIsVisible(shouldShow)
    }
  }, [user, objectives, isLoading])

  const handleDismiss = async () => {
    if (!user) return
    setIsVisible(false)
    await dismissObjectivesPopup(user.uid)
  }

  if (!isVisible || !objectives) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto relative group max-w-md w-full">
        {/* Glassmorphic card - matching landing page review cards */}
        <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl hover:border-white/20 transition-all duration-300">
          {/* Close button */}
          <Button
            onClick={handleDismiss}
            variant="ghost"
            size="sm"
            className="absolute top-3 right-3 h-8 w-8 p-0 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Header */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold text-white mb-1">Get Started</h3>
            <p className="text-sm text-white/60">Complete these steps to unlock your full potential</p>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/60">Progress</span>
              <span className="text-xs font-medium text-white">{objectives.percentageComplete}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 transition-all duration-500"
                style={{ width: `${objectives.percentageComplete}%` }}
              />
            </div>
          </div>

          {/* Objectives list */}
          <div className="space-y-3">
            {objectives.objectives.map((objective) => (
              <div
                key={objective.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-200"
              >
                {objective.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-teal-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Circle className="h-5 w-5 text-white/20 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${objective.completed ? "text-white/60 line-through" : "text-white"}`}
                  >
                    {objective.title}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">{objective.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subtle glow effect on hover */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-500/5 to-cyan-400/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </div>
  )
}
