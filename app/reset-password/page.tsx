import { redirect } from "next/navigation"

export default function ResetPasswordPage() {
  // This page should only be accessed with the oobCode parameter
  // If accessed directly, redirect to the forgot password page
  redirect("/forgot-password")
}
