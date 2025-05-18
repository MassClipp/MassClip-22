import { SetupProfileForm } from "@/components/setup-profile-form"

export const metadata = {
  title: "Set Up Your Creator Profile | MassClip",
  description: "Create your unique creator profile on MassClip",
}

export default function SetupProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <SetupProfileForm />
      </div>
    </div>
  )
}
