import ClipPlayer from "@/components/ClipPlayer"

export default function TestPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">Test Video from Cloudflare</h1>
      <ClipPlayer src="https://pub-0b3ce0bc519f469c81f8ed504a1ee451.r2.dev/2819%20%20Deceived.mp4" />
    </div>
  )
}
