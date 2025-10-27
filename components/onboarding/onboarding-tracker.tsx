"use client"

import { useState } from "react"
import { X, Check, ChevronDown, ChevronUp } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface OnboardingTask {
  id: string
  title: string
  description: string
  completed: boolean
  route: string
}

interface OnboardingTrackerProps {
  tasks: OnboardingTask[]
  currentTaskIndex: number
  allTasksCompleted: boolean
  onDismiss: () => void
}

export function OnboardingTracker({ tasks, currentTaskIndex, allTasksCompleted, onDismiss }: OnboardingTrackerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const router = useRouter()

  const completedCount = tasks.filter((t) => t.completed).length

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-lg border border-border rounded-lg shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
              {completedCount}
            </div>
            <div>
              <h3 className="font-semibold text-sm">Getting Started</h3>
              <p className="text-xs text-muted-foreground">
                {completedCount} of {tasks.length} completed
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-accent rounded transition-colors"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {allTasksCompleted && (
            <button onClick={onDismiss} className="p-1 hover:bg-accent rounded transition-colors" aria-label="Dismiss">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="w-full h-2 bg-accent rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
            initial={{ width: 0 }}
            animate={{ width: `${(completedCount / tasks.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Task list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
              {tasks.map((task, index) => (
                <button
                  key={task.id}
                  onClick={() => !task.completed && router.push(task.route)}
                  disabled={task.completed}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    task.completed
                      ? "bg-accent/50 border-border cursor-default"
                      : index === currentTaskIndex
                        ? "bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/50 hover:border-purple-500 cursor-pointer"
                        : "bg-background border-border hover:bg-accent cursor-pointer",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                        task.completed
                          ? "bg-green-500 border-green-500"
                          : index === currentTaskIndex
                            ? "border-purple-500"
                            : "border-muted-foreground/30",
                      )}
                    >
                      {task.completed && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          task.completed ? "text-muted-foreground line-through" : "text-foreground",
                        )}
                      >
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion message */}
      {allTasksCompleted && (
        <div className="p-4 border-t border-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <p className="text-sm font-medium text-center">🎉 All set! You're ready to start selling.</p>
        </div>
      )}
    </motion.div>
  )
}
