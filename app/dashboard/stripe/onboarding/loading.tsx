import { Loader2 } from "lucide-react"

export default function OnboardingLoading() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading onboarding...</span>
      </div>
    </div>
  )
}
