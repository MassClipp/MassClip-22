"use client"

import type React from "react"

import { useOnboarding } from "@/hooks/use-onboarding"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Circle, ChevronRight, Sparkles, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { useEffect } from "react"

const STEP_ROUTES: Record<string, string> = {
  setup_storefront: "/dashboard/view-storefront",
  upload_content: "/dashboard/upload",
  add_free_content: "/dashboard/free-content",
  setup_stripe: "/dashboard/earnings",
  create_bundle: "/dashboard/bundles",
  go_live: "/dashboard/view-storefront",
}

export function OnboardingChecklist() {
  const { progress, loading, dismiss, completeStep } = useOnboarding()
  const router = useRouter()

  useEffect(() => {
    console.log("[v0] OnboardingChecklist - Render state:", {
      loading,
      hasProgress: !!progress,
      isComplete: progress?.isComplete,
      completedCount: progress?.completedSteps?.length,
      totalCount: progress?.steps?.length,
    })
  }, [loading, progress])

  if (loading) {
    return null
  }

  if (!progress || progress.dismissed) {
    return null
  }

  if (progress.isComplete) {
    console.log("[v0] OnboardingChecklist - Showing completion state")
    return (
      <Card className="border-green-800 bg-gradient-to-br from-green-900/20 to-zinc-900/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white">Objectives Complete!</CardTitle>
            </div>
            <button onClick={dismiss} className="p-1 hover:bg-zinc-800 rounded transition-colors" title="Dismiss">
              <X className="h-4 w-4 text-zinc-400" />
            </button>
          </div>
          <CardDescription>Let's make your first $50</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const completedCount = progress.completedSteps.length
  const totalCount = progress.steps.length
  const progressPercent = (completedCount / totalCount) * 100

  console.log("[v0] OnboardingChecklist - Showing active checklist:", {
    completedCount,
    totalCount,
    progressPercent,
    currentStep: progress.currentStep,
  })

  const handleStepClick = async (stepId: string, completed: boolean, e: React.MouseEvent) => {
    // Check if the click was on the circle icon area (left side)
    const target = e.target as HTMLElement
    const isCircleClick = target.closest(".step-circle")

    if (isCircleClick && !completed) {
      e.stopPropagation()
      try {
        await completeStep(stepId)
      } catch (err) {
        console.error("[v0] OnboardingChecklist - Error completing step:", err)
      }
    } else if (!isCircleClick) {
      // Navigate to the route if clicking elsewhere
      const route = STEP_ROUTES[stepId]
      if (route) {
        router.push(route)
      }
    }
  }

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

          return (
            <button
              key={step.id}
              onClick={(e) => handleStepClick(step.id, step.completed, e)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
                "hover:bg-zinc-800/50",
                isActive && "bg-zinc-800/70 ring-1 ring-blue-500/30",
                step.completed && "opacity-60",
              )}
            >
              <div
                className="flex-shrink-0 step-circle cursor-pointer"
                title={step.completed ? "Completed" : "Click to mark complete"}
              >
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
