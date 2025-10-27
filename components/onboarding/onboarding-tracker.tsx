"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useOnboarding } from "@/contexts/onboarding-context"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function OnboardingTracker() {
  const { progress, dismissOnboarding } = useOnboarding()
  const [isExpanded, setIsExpanded] = useState(true)
  const router = useRouter()

  if (!progress || progress.isDismissed) {
    return null
  }

  const completedCount = progress.tasks.filter((t) => t.completed).length
  const totalCount = progress.tasks.length
  const progressPercentage = (completedCount / totalCount) * 100

  const canDismiss = progress.isComplete

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 right-4 w-80 bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg z-50"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">Getting Started</h3>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          {canDismiss && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={dismissOnboarding}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-pink-500 to-purple-600"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {progress.tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    task.completed
                      ? "bg-muted/50 border-muted"
                      : index === progress.currentTaskIndex
                        ? "bg-gradient-to-r from-pink-500/10 to-purple-600/10 border-pink-500/50"
                        : "bg-background border-border hover:bg-muted/30"
                  }`}
                  onClick={() => task.route && router.push(task.route)}
                >
                  <div
                    className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      task.completed
                        ? "bg-green-500 border-green-500"
                        : index === progress.currentTaskIndex
                          ? "border-pink-500"
                          : "border-muted-foreground/30"
                    }`}
                  >
                    {task.completed && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
