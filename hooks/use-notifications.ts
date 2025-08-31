"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"

export interface Notification {
  id: string
  userId: string
  type: "purchase" | "download" | "system"
  title: string
  message: string
  data?: {
    bundleId?: string
    bundleTitle?: string
    buyerName?: string
    amount?: number
    currency?: string
    downloadCount?: number
    contentTitle?: string
  }
  read: boolean
  createdAt: Date
  updatedAt: Date
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const idToken = await user.getIdToken()
      const response = await fetch("/api/notifications", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch notifications")
      }

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch (err: any) {
      console.error("Error fetching notifications:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "mark_read",
          notificationId,
        }),
      })

      if (response.ok) {
        // Update local state
        setNotifications((prev) =>
          prev.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification,
          ),
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    try {
      const idToken = await user.getIdToken()
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          action: "mark_all_read",
        }),
      })

      if (response.ok) {
        // Update local state
        setNotifications((prev) => prev.map((notification) => ({ ...notification, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error("Error marking all notifications as read:", err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user])

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return

    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [user])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  }
}
