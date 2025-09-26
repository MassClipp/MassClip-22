"use client"

import { useUserPlan } from "@/hooks/use-user-plan"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface UserPlanBadgeProps {
  showTooltip?: boolean
  className?: string
}

export default function UserPlanBadge({ showTooltip = true, className = "" }: UserPlanBadgeProps) {
  const { planData, isProUser, loading } = useUserPlan()

  if (loading) {
    return null
  }

  const badge = (
    <div className={`flex items-center ${className}`}>
      {isProUser && (
        <span className="flex items-center text-xs bg-gradient-to-r from-blue-500 to-blue-600 text-white px-2 py-0.5 rounded-full font-medium">
          PRO
        </span>
      )}
    </div>
  )

  if (!showTooltip) {
    return badge
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom">
          {isProUser ? (
            <div className="text-sm">
              <p className="font-medium">Creator Pro Plan</p>
            </div>
          ) : (
            <div className="text-sm">
              <p className="font-medium">Free Plan</p>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
