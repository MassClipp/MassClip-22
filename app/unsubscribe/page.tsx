"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UnsubscribePage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [message, setMessage] = useState("")

  const handleUnsubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus("loading")

    try {
      const response = await fetch(`/api/unsubscribe?email=${encodeURIComponent(email)}`)
      if (response.ok) {
        setStatus("success")
        setMessage("You have been successfully unsubscribed from our mailing list.")
      } else {
        setStatus("error")
        setMessage("There was an error processing your request. Please try again.")
      }
    } catch (error) {
      setStatus("error")
      setMessage("There was an error processing your request. Please try again.")
    }
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Unsubscribed Successfully</CardTitle>
            <CardDescription>You will no longer receive emails from MassClip.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              If you change your mind, you can always sign up again at{" "}
              <a href="https://massclip.pro" className="text-blue-600 hover:underline">
                massclip.pro
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Unsubscribe from MassClip</CardTitle>
          <CardDescription>Enter your email address to unsubscribe from our mailing list.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUnsubscribe} className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={status === "loading"}>
              {status === "loading" ? "Unsubscribing..." : "Unsubscribe"}
            </Button>
            {status === "error" && <p className="text-sm text-red-600">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
