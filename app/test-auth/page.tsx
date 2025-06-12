"use client"

import { useState } from "react"
import { useFirebaseAuth } from "@/hooks/use-firebase-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function TestAuthPage() {
  const { user, signIn, signUp, signOut, loading } = useFirebaseAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [message, setMessage] = useState("")

  const testSignUp = async () => {
    try {
      setMessage("Testing signup...")
      const result = await signUp(email, password, username)
      setMessage(result.success ? "Signup successful!" : `Signup failed: ${result.error}`)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const testSignIn = async () => {
    try {
      setMessage("Testing signin...")
      const result = await signIn(email, password)
      setMessage(result.success ? "Signin successful!" : `Signin failed: ${result.error}`)
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  const testSignOut = async () => {
    try {
      setMessage("Testing signout...")
      await signOut()
      setMessage("Signout successful!")
    } catch (error: any) {
      setMessage(`Error: ${error.message}`)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Authentication Test</h1>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle>Current Auth State</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2">
                <p>✅ Logged in as: {user.email}</p>
                <p>User ID: {user.uid}</p>
                <Button onClick={testSignOut} variant="destructive">
                  Sign Out
                </Button>
              </div>
            ) : (
              <p>❌ Not logged in</p>
            )}
          </CardContent>
        </Card>

        {!user && (
          <Card className="bg-gray-900 border-gray-700">
            <CardHeader>
              <CardTitle>Test Authentication</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
              <Input
                placeholder="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
              <Input
                placeholder="Username (for signup)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
              <div className="flex gap-2">
                <Button onClick={testSignIn} className="flex-1">
                  Test Sign In
                </Button>
                <Button onClick={testSignUp} className="flex-1" variant="outline">
                  Test Sign Up
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {message && (
          <Alert>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
