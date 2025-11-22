import { LandingContentPack } from "@/components/landing-content-pack"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "150+ High Quality Motivational Clips | Quick Content Boost",
  description:
    "Get instant access to 150+ high quality motivational clips. Perfect for theme pages and content creators. Start selling or posting today!",
  openGraph: {
    title: "150+ High Quality Motivational Clips | Quick Content Boost",
    description:
      "Get instant access to 150+ high quality motivational clips. Perfect for theme pages and content creators.",
    type: "website",
  },
}

export default function ContentPackLandingPage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="w-full">
        <LandingContentPack />

        <section className="py-16 px-6 border-t border-white/10">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-3xl font-bold mb-10 text-center text-white">Preview</h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Video 1 */}
              <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                <video
                  src="https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/Motivation/1763847406270-Real_AF_._Analysis_Paralysis.mov"
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  muted
                />
              </div>

              {/* Video 2 */}
              <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                <video
                  src="https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1763566379011-Eric_Thomas__Enough_is_Enough.mp4"
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  muted
                />
              </div>

              {/* Video 3 */}
              <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                <video
                  src="https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stack/1763488268212-Inky_Johnson-2.mov"
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  muted
                />
              </div>

              {/* Video 4 */}
              <div className="aspect-[9/16] relative rounded-xl overflow-hidden bg-zinc-900 border border-white/10">
                <video
                  src="https://pub-93cabcf58da344dea3d33ba1e4be2ef2.r2.dev/creators/stacksavvy8/1759800834232-Damii-2.mov"
                  className="w-full h-full object-cover"
                  controls
                  preload="metadata"
                  playsInline
                  muted
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
