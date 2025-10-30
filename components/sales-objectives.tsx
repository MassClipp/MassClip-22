"use client"

import { useEffect, useState } from "react"
import { useStripeEarnings } from "@/hooks/use-stripe-earnings"
import { Check, Lock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Objective {
  id: string
  title: string
  description: string
  target: number
  metric: "earnings" | "sales" | "uploads" | "bundles"
  completed: boolean
  progress: number
}

interface Tier {
  id: string
  name: string
  description: string
  objectives: Objective[]
  unlocked: boolean
  completed: boolean
}

export function SalesObjectives() {
  const { earningsData, isLoading } = useStripeEarnings()
  const [tiers, setTiers] = useState<Tier[]>([])

  useEffect(() => {
    if (!earningsData) return

    const totalEarnings = earningsData.totalEarnings || 0
    const totalSales = earningsData.salesMetrics?.totalSales || 0

    // Define the tier structure with objectives
    const tierData: Tier[] = [
      {
        id: "starter",
        name: "Starter",
        description: "Launch your creator journey",
        unlocked: true,
        completed: false,
        objectives: [
          {
            id: "first_sale",
            title: "Make Your First Sale",
            description: "Complete your first transaction",
            target: 1,
            metric: "sales",
            completed: totalSales >= 1,
            progress: Math.min((totalSales / 1) * 100, 100),
          },
          {
            id: "earn_50",
            title: "Earn $50",
            description: "Reach your first earnings milestone",
            target: 50,
            metric: "earnings",
            completed: totalEarnings >= 50,
            progress: Math.min((totalEarnings / 50) * 100, 100),
          },
          {
            id: "five_sales",
            title: "5 Sales",
            description: "Build momentum with 5 transactions",
            target: 5,
            metric: "sales",
            completed: totalSales >= 5,
            progress: Math.min((totalSales / 5) * 100, 100),
          },
        ],
      },
      {
        id: "builder",
        name: "Builder",
        description: "Establish your presence",
        unlocked: totalSales >= 5 && totalEarnings >= 50,
        completed: false,
        objectives: [
          {
            id: "earn_250",
            title: "Earn $250",
            description: "Quarter your way to success",
            target: 250,
            metric: "earnings",
            completed: totalEarnings >= 250,
            progress: Math.min((totalEarnings / 250) * 100, 100),
          },
          {
            id: "twenty_sales",
            title: "20 Sales",
            description: "Prove your product-market fit",
            target: 20,
            metric: "sales",
            completed: totalSales >= 20,
            progress: Math.min((totalSales / 20) * 100, 100),
          },
          {
            id: "earn_500",
            title: "Earn $500",
            description: "Hit your first major milestone",
            target: 500,
            metric: "earnings",
            completed: totalEarnings >= 500,
            progress: Math.min((totalEarnings / 500) * 100, 100),
          },
        ],
      },
      {
        id: "grower",
        name: "Grower",
        description: "Scale your business",
        unlocked: totalSales >= 20 && totalEarnings >= 500,
        completed: false,
        objectives: [
          {
            id: "earn_1500",
            title: "Earn $1,500",
            description: "Enter serious creator territory",
            target: 1500,
            metric: "earnings",
            completed: totalEarnings >= 1500,
            progress: Math.min((totalEarnings / 1500) * 100, 100),
          },
          {
            id: "fifty_sales",
            title: "50 Sales",
            description: "Build a loyal customer base",
            target: 50,
            metric: "sales",
            completed: totalSales >= 50,
            progress: Math.min((totalSales / 50) * 100, 100),
          },
          {
            id: "earn_2500",
            title: "Earn $2,500",
            description: "Reach professional creator status",
            target: 2500,
            metric: "earnings",
            completed: totalEarnings >= 2500,
            progress: Math.min((totalEarnings / 2500) * 100, 100),
          },
        ],
      },
      {
        id: "mogul",
        name: "Mogul",
        description: "Master the platform",
        unlocked: totalSales >= 50 && totalEarnings >= 2500,
        completed: false,
        objectives: [
          {
            id: "earn_5000",
            title: "Earn $5,000",
            description: "Join the elite creators",
            target: 5000,
            metric: "earnings",
            completed: totalEarnings >= 5000,
            progress: Math.min((totalEarnings / 5000) * 100, 100),
          },
          {
            id: "hundred_sales",
            title: "100 Sales",
            description: "Achieve triple-digit transactions",
            target: 100,
            metric: "sales",
            completed: totalSales >= 100,
            progress: Math.min((totalSales / 100) * 100, 100),
          },
          {
            id: "earn_10000",
            title: "Earn $10,000",
            description: "Reach five-figure earnings",
            target: 10000,
            metric: "earnings",
            completed: totalEarnings >= 10000,
            progress: Math.min((totalEarnings / 10000) * 100, 100),
          },
        ],
      },
    ]

    // Calculate completion status for each tier
    tierData.forEach((tier) => {
      tier.completed = tier.objectives.every((obj) => obj.completed)
    })

    setTiers(tierData)
  }, [earningsData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading objectives...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="mb-12 px-8 pt-8">
        <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">Sales Objectives</h1>
        <p className="text-zinc-400 text-lg">Track your progress and unlock new tiers</p>
      </div>

      {/* Tiers */}
      <div className="space-y-8 px-8 pb-8">
        {tiers.map((tier, tierIndex) => {
          const completedObjectives = tier.objectives.filter((obj) => obj.completed).length
          const totalObjectives = tier.objectives.length

          return (
            <div key={tier.id} className={cn("transition-all duration-300", !tier.unlocked && "opacity-60")}>
              {/* Tier Header */}
              <div className="mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {/* Tier Number Badge */}
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold",
                        tier.completed
                          ? "bg-emerald-500/10 text-emerald-400"
                          : tier.unlocked
                            ? "bg-zinc-800 text-white"
                            : "bg-zinc-900 text-zinc-600",
                      )}
                    >
                      {tier.completed ? <Check className="h-6 w-6" /> : tierIndex + 1}
                    </div>

                    {/* Tier Info */}
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-2xl font-bold text-white tracking-tight">{tier.name}</h2>
                        {!tier.unlocked && <Lock className="h-4 w-4 text-zinc-600" />}
                      </div>
                      <p className="text-zinc-500 text-sm">{tier.description}</p>
                    </div>
                  </div>

                  {/* Progress Badge */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-white">
                      {completedObjectives}/{totalObjectives}
                    </div>
                    <div className="text-xs text-zinc-500 uppercase tracking-wider">Completed</div>
                  </div>
                </div>
              </div>

              {/* Objectives */}
              <div className="space-y-3">
                {tier.objectives.map((objective) => (
                  <div
                    key={objective.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border transition-all",
                      objective.completed
                        ? "border-emerald-900/50 bg-emerald-950/20"
                        : tier.unlocked
                          ? "border-zinc-800 bg-zinc-900/30"
                          : "border-zinc-900 bg-zinc-900/10",
                    )}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-all",
                          objective.completed ? "border-emerald-500 bg-emerald-500" : "border-zinc-700 bg-transparent",
                        )}
                      >
                        {objective.completed && <Check className="h-4 w-4 text-black" />}
                      </div>

                      {/* Objective Info */}
                      <div className="flex-1">
                        <div className="font-semibold text-white mb-0.5">{objective.title}</div>
                        <div className="text-sm text-zinc-500">{objective.description}</div>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="text-right ml-4">
                      <div
                        className={cn(
                          "text-sm font-medium",
                          objective.completed ? "text-emerald-400" : "text-zinc-400",
                        )}
                      >
                        {objective.progress.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
