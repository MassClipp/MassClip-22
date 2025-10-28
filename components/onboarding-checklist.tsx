"use client"

import { useOnboarding } from "@/hooks/use-onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ChevronRight, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const STEP_ROUTES: Record<string, string> = {
  setup_storefront: "/dashboard/view-storefront",
  upload_content: "/dashboard/upload",
  add_free_content: "/dashboard/free-content",
  setup_stripe: "/dashboard/earnings",
  create_bundle: "/dashboard/bundles",
  go_live: "/dashboard/view-storefront",
}

export function OnboardingChecklist() {
  const { progress, loading } = useOnboarding()
  const router = useRouter()

  if (loading || !progress) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader>
          <CardTitle className="text-white">Getting Started</CardTitle>
          <CardDescription>Loading your progress...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (progress.isComplete) {
    return (
      <Card className="border-green-800 bg-gradient-to-br from-green-900/20 to-zinc-900/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-green-400" />
            <CardTitle className="text-white">All Set!</CardTitle>
          </div>
          <CardDescription>You've completed all onboarding steps. Your storefront is ready!</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const completedCount = progress.completedSteps.length
  const totalCount = progress.steps.length
  const progressPercent = (completedCount / totalCount) * 100

  return (
    <Card className="border-zinc-800 bg-zinc-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Getting Started</CardTitle>
            <CardDescription>
              {completedCount} of {totalCount} steps completed
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {Math.round(progressPercent)}%
          </Badge>
        </div>
        <div className="mt-4 h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {progress.steps.map((step, index) => {
          const isActive = step.id === progress.currentStep
          const route = STEP_ROUTES[step.id]

          return (
            <button
              key={step.id}
              onClick={() => route && router.push(route)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                "hover:bg-zinc-800/50",
                isActive && "bg-zinc-800/70 ring-1 ring-blue-500/30",
                step.completed && "opacity-60",
              )}
            >
              <div className="flex-shrink-0">
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                ) : (
                  <Circle className={cn("h-5 w-5", isActive ? "text-blue-400" : "text-zinc-600")} />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className={cn("font-medium", step.completed ? "text-zinc-400" : "text-white")}>{step.title}</div>
                <div className="text-sm text-zinc-500">{step.description}</div>
              </div>
              {isActive && !step.completed && <ChevronRight className="h-5 w-5 text-blue-400" />}
            </button>
          )
        })}
      </CardContent>
    </Card>
  )
}
