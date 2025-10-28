"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { usePathname } from "next/navigation"
import {
  getUserObjectives,
  ensureUserObjectives,
  showObjectivesPopup,
  type UserObjectivesDoc,
} from "@/lib/objectives-service"

export function useObjectives() {
  const { user } = useAuth()
  const pathname = usePathname()
  const [objectives, setObjectives] = useState<UserObjectivesDoc | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navButtonRefs = useRef<Map<string, HTMLElement>>(new Map())
  const [refreshCounter, setRefreshCounter] = useState(0)

  const currentObjective = objectives?.objectives.find((obj) => !obj.completed) || null

  useEffect(() => {
    const loadObjectives = async () => {
      if (!user) {
        setIsLoading(false)
        return
      }

      try {
        const data = await ensureUserObjectives(user.uid)
        setObjectives(data)
      } catch (error) {
        console.error("[useObjectives] Error loading objectives:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadObjectives()
  }, [user, refreshCounter])

  useEffect(() => {
    if (!objectives || objectives.percentageComplete === 100) return

    const targetHref = currentObjective?.id
      ? {
          customize_storefront: "/dashboard/view-storefront",
          upload_content: "/dashboard/upload",
          add_free_content: "/dashboard/free-content",
          connect_stripe: "/dashboard/earnings",
          create_bundle: "/dashboard/bundles",
          go_live: "/dashboard/view-storefront",
        }[currentObjective.id]
      : null

    if (!targetHref) return

    // Wait a bit for the DOM to be ready
    const timer = setTimeout(() => {
      const navButton = navButtonRefs.current.get(targetHref)
      if (navButton) {
        navButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        })
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [objectives, pathname, refreshCounter])

  const refreshObjectives = async () => {
    if (!user) return

    try {
      console.log("[useObjectives] Refreshing objectives...")
      const data = await getUserObjectives(user.uid)
      setObjectives(data)
      setRefreshCounter((prev) => prev + 1)
      console.log("[useObjectives] Objectives refreshed successfully")
    } catch (error) {
      console.error("[useObjectives] Error refreshing objectives:", error)
    }
  }

  const reopenPopup = async () => {
    if (!user) return

    try {
      await showObjectivesPopup(user.uid)
      await refreshObjectives()
    } catch (error) {
      console.error("[useObjectives] Error reopening popup:", error)
    }
  }

  const registerNavButton = (href: string, element: HTMLElement | null) => {
    if (element) {
      navButtonRefs.current.set(href, element)
    } else {
      navButtonRefs.current.delete(href)
    }
  }

  return {
    objectives,
    isLoading,
    refreshObjectives,
    reopenPopup,
    registerNavButton,
    currentObjective, // Export current objective
  }
}
