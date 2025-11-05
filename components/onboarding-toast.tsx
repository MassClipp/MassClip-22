"use client"

import { CheckCircle2, Sparkles } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export function useOnboardingToast() {
  const { toast } = useToast()

  const showStepCompleted = (stepTitle: string, isLastStep = false) => {
    toast({
      title: (
        <div className="flex items-center gap-2">
          {isLastStep ? (
            <Sparkles className="h-5 w-5 text-green-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-400" />
          )}
          <span>{isLastStep ? "All Done!" : "Step Completed"}</span>
        </div>
      ) as any,
      description: isLastStep
        ? "You've completed all onboarding steps! Your storefront is ready to go live."
        : `${stepTitle} completed successfully!`,
      variant: "gradient" as any,
      duration: 5000,
    })
  }

  return { showStepCompleted }
}
