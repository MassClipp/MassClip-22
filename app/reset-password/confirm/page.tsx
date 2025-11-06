import ResetPasswordConfirmForm from "@/components/reset-password-confirm-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
  title: "Reset Password | MassClip",
  description: "Reset your password to access your MassClip account",
}

export default function ResetPasswordConfirmPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-full max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
              <CardDescription>Enter your new password below</CardDescription>
            </CardHeader>
            <CardContent>
              <ResetPasswordConfirmForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
