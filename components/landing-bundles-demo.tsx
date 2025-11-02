"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Package, DollarSign, Lock, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"

export function LandingBundlesDemo() {
  const [bundleName, setBundleName] = useState("")
  const [bundlePrice, setBundlePrice] = useState("")
  const [showPreview, setShowPreview] = useState(false)
  const router = useRouter()

  const handleCreatePreview = () => {
    if (!bundleName || !bundlePrice) return
    setShowPreview(true)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-thin text-white">Create Sellable Bundles</h2>
        <p className="text-white/60 font-light text-lg">See how easy it is to package and sell your content</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left: Bundle Creation */}
        <div className="space-y-6">
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-4">
            <div>
              <label className="text-white/70 text-sm font-light mb-2 block">Bundle Name</label>
              <Input
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="e.g., Motivational Video Pack"
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
            </div>

            <div>
              <label className="text-white/70 text-sm font-light mb-2 block">Price</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <Input
                  type="number"
                  value={bundlePrice}
                  onChange={(e) => setBundlePrice(e.target.value)}
                  placeholder="29.99"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pl-10"
                />
              </div>
            </div>

            <div className="bg-black/40 rounded-lg p-4 border border-white/10">
              <p className="text-white/60 text-sm font-light mb-2">Bundle Contents (Demo)</p>
              <div className="space-y-2">
                {["Motivational Speech 1.mp4", "Success Tips.mp4", "Daily Affirmations.mp4"].map((file, i) => (
                  <div key={i} className="text-white/80 text-sm font-light flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                    {file}
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={handleCreatePreview}
              disabled={!bundleName || !bundlePrice}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white font-light py-6"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Preview Bundle
            </Button>
          </div>
        </div>

        {/* Right: Bundle Preview */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-white font-light text-lg">Bundle Preview</h3>
            {showPreview && (
              <Button
                size="sm"
                onClick={() => router.push("/signup")}
                className="bg-teal-500 hover:bg-teal-600 text-white"
              >
                <Lock className="w-4 h-4 mr-2" />
                Sign Up to Publish
              </Button>
            )}
          </div>

          {!showPreview ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <Package className="w-16 h-16 text-white/20 mb-4" />
              <p className="text-white/40 font-light">Fill in the details to preview your bundle</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Bundle Card Preview */}
              <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-xl p-6 border border-teal-400/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-white text-xl font-light mb-1">{bundleName}</h4>
                    <p className="text-white/60 text-sm font-light">3 files included</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-light text-white">${bundlePrice}</div>
                    <p className="text-white/60 text-xs">one-time</p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {["Motivational Speech 1.mp4", "Success Tips.mp4", "Daily Affirmations.mp4"].map((file, i) => (
                    <div key={i} className="text-white/80 text-sm font-light flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      {file}
                    </div>
                  ))}
                </div>

                <Button className="w-full bg-white text-black hover:bg-white/90 font-light">Purchase Bundle</Button>
              </div>

              <div className="bg-black/40 rounded-lg p-4 border border-white/10">
                <p className="text-white/70 text-sm font-light mb-2">
                  This is how your bundle will appear to customers on your storefront.
                </p>
                <p className="text-white/50 text-xs font-light">Sign up to publish and start selling immediately!</p>
              </div>

              <Button
                onClick={() => router.push("/signup")}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-400 hover:from-teal-600 hover:to-cyan-500 text-white font-light py-6 text-lg"
              >
                Sign Up to Publish Bundle
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-3 gap-6 pt-8">
        {[
          { title: "Instant Setup", desc: "Create and publish bundles in minutes" },
          { title: "Stripe Integration", desc: "Secure payments handled automatically" },
          { title: "Your Storefront", desc: "Custom branded page for your content" },
        ].map((feature, i) => (
          <div key={i} className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
            <h4 className="text-white font-light mb-2">{feature.title}</h4>
            <p className="text-white/60 text-sm font-light">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
