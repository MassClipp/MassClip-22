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

        <div className="mt-8 p-4 border border-amber-400/20 bg-amber-400/5 max-w-md text-center">
          <p className="text-amber-400 text-sm mb-2 font-medium">BETA NOTICE</p>
          <p className="text-white/80 text-sm">
            We are currently working on stabilizing the password reset system. If you encounter any issues, please
            contact us at{" "}
            <a href="mailto:John@massclip.pro" className="text-amber-400 hover:text-amber-300">
              John@massclip.pro
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
