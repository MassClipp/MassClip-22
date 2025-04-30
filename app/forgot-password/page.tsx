import PasswordResetForm from "@/components/password-reset-form"

export const metadata = {
  title: "Forgot Password | MassClip",
  description: "Reset your MassClip password",
}

export default function ForgotPasswordPage() {
  return (
    <div className="container max-w-screen-xl mx-auto px-4 py-12">
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <h1 className="text-3xl font-bold mb-8 text-center">Forgot Password</h1>
        <PasswordResetForm />
      </div>
    </div>
  )
}
