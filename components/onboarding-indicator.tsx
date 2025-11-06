"use client"

import { useOnboarding } from "@/hooks/use-onboarding"
import { usePathname } from "next/navigation"
import { CheckCircle2, Circle, ChevronRight, X, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

const STEP_ROUTES: Record<string, string> = {
  setup_storefront: "/dashboard/view-storefront",
  upload_content: "/dashboard/upload",
  add_free_content: "/dashboard/free-content",
  setup_stripe: "/dashboard/earnings",
  create_bundle: "/dashboard/bundles",
  go_live: "/dashboard/view-storefront",
}

export function OnboardingIndicator() {
  const { progress, loading, dismiss } = useOnboarding()
  const pathname = usePathname()
  const router = useRouter()
  const [isMinimized, setIsMinimized] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false) // Declare setIsDismissed

  if (pathname === "/dashboard") {
    return null
  }

  if (loading || !progress || progress.dismissed) {
    return null
  }

  if (progress.isComplete) {
    if (isMinimized) {
      return (
        <button
          onClick={() => setIsMinimized(false)}
          className="fixed bottom-6 right-6 z-50 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]"
        >
          <div className="px-4 py-3 flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-white font-medium text-sm">Setup Complete</span>
            <ChevronDown className="h-4 w-4 text-zinc-400" />
          </div>
        </button>
      )
    }

    return (
      <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent" />
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="space-y-1">
                  <h3 className="font-semibold text-white text-lg tracking-tight">Setup Complete</h3>
                  <p className="text-zinc-400 text-sm">Ready to earn your first $50?</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setIsMinimized(true)}
                    className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
                    title="Minimize"
                  >
                    <ChevronDown className="h-4 w-4 text-zinc-500" />
                  </button>
                  <button
                    onClick={dismiss}
                    className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors"
                    title="Dismiss"
                  >
                    <X className="h-4 w-4 text-zinc-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const completedCount = progress.completedSteps.length
  const totalCount = progress.steps.length
  const progressPercent = (completedCount / totalCount) * 100

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] rounded-full shadow-2xl hover:scale-105 transition-transform"
      >
        <div className="bg-zinc-900 rounded-full px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-blue-400" />
          <span className="text-white font-medium text-sm">
            {completedCount}/{totalCount}
          </span>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </div>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] rounded-lg shadow-2xl">
        <div className="bg-zinc-900 rounded-lg">
          {/* Header */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white">Getting Started</h3>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                  {Math.round(progressPercent)}%
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Minimize"
                >
                  <ChevronDown className="h-4 w-4 text-zinc-400" />
                </button>
                <button
                  onClick={() => setIsDismissed(true)}
                  className="p-1 hover:bg-zinc-800 rounded transition-colors"
                  title="Dismiss"
                >
                  <X className="h-4 w-4 text-zinc-400" />
                </button>
              </div>
            </div>
            <div className="text-xs text-zinc-400 mb-2">
              {completedCount} of {totalCount} steps completed
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Steps */}
          <div className="p-3 space-y-1 max-h-80 overflow-y-auto">
            {progress.steps.map((step) => {
              const isActive = step.id === progress.currentStep
              const route = STEP_ROUTES[step.id]

              return (
                <button
                  key={step.id}
                  onClick={() => route && router.push(route)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg transition-all text-left",
                    "hover:bg-zinc-800/50",
                    isActive && "bg-zinc-800/70 ring-1 ring-blue-500/30",
                    step.completed && "opacity-60",
                  )}
                >
                  <div className="flex-shrink-0">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-400" />
                    ) : (
                      <Circle className={cn("h-4 w-4", isActive ? "text-blue-400" : "text-zinc-600")} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={cn("text-sm font-medium truncate", step.completed ? "text-zinc-400" : "text-white")}
                    >
                      {step.title}
                    </div>
                  </div>
                  {isActive && !step.completed && <ChevronRight className="h-4 w-4 text-blue-400 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
