"use client"
import Link from "next/link"
import SignupForm from "@/components/signup-form"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="max-w-md w-full bg-zinc-900 p-8 rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create your account</h1>
          <p className="text-zinc-400 mt-2">Sign up to access and share premium content</p>
        </div>

        <SignupForm />

        <div className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:text-blue-400">
            Log in
          </Link>
        </div>
      </div>
    </div>
  )
}
