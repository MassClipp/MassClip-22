import { Button } from "@/components/ui/button"
import Link from "next/link"

export const metadata = {
  title: "Password Reset | MassClip",
  description: "Your password has been reset successfully",
}

export default function ResetPasswordPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Password Reset</h1>

          <div className="bg-white p-8 rounded-lg shadow-md">
            <p className="text-lg mb-6">
              Your password has been reset successfully. You can now log in with your new password.
            </p>

            <Link href="/login" passHref>
              <Button className="w-full">Go to Login</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
