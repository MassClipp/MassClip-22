"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { auth } from "@/firebase/config"

const LoginForm = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password.")
      setIsLoading(false)
      return
    }

    try {
      // Simulate login (replace with actual authentication logic)
      await new Promise((resolve) => setTimeout(resolve, 1500)) // Simulate network request

      // For demonstration purposes, check if the credentials are valid
      if (email === "test@example.com" && password === "password") {
        console.log("Login successful")
        router.push("/dashboard") // Redirect to dashboard upon successful login
      } else {
        setError("Invalid email or password.")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError("Failed to login. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError("")

    try {
      const provider = new GoogleAuthProvider()
      provider.addScope("email")
      provider.addScope("profile")

      const result = await signInWithPopup(auth, provider)
      console.log("Google sign-in successful:", result.user)

      // Check for redirect URL after login
      const redirectUrl = localStorage.getItem("redirectAfterLogin")
      if (redirectUrl) {
        localStorage.removeItem("redirectAfterLogin")
        window.location.href = redirectUrl
      } else {
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error("Google sign-in error:", error)

      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in was cancelled. Please try again.")
      } else if (error.code === "auth/popup-blocked") {
        setError("Popup was blocked by your browser. Please allow popups and try again.")
      } else if (error.code === "auth/account-exists-with-different-credential") {
        setError("An account already exists with this email using a different sign-in method.")
      } else {
        setError("Failed to sign in with Google. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-10">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      <div className="mb-4">
        <label htmlFor="email" className="block text-gray-700 text-sm font-bold mb-2">
          Email:
        </label>
        <input
          type="email"
          id="email"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="mb-6">
        <label htmlFor="password" className="block text-gray-700 text-sm font-bold mb-2">
          Password:
        </label>
        <input
          type="password"
          id="password"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? "Logging in..." : "Log In"}
        </button>
        <a className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800" href="#">
          Forgot Password?
        </a>
      </div>
      <div className="mt-4">
        <button
          type="button"
          className="w-full bg-white hover:bg-gray-100 text-gray-800 font-semibold py-2 px-4 border border-gray-400 rounded shadow"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          Sign in with Google
        </button>
      </div>
    </form>
  )
}

export default LoginForm
