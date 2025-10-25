import { Instagram } from "lucide-react"

export function LandingReview() {
  return (
    <section className="py-16 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="relative group">
          {/* Glassmorphic card */}
          <div className="bg-white/[0.02] backdrop-blur-md border border-white/10 rounded-xl p-8 shadow-2xl hover:border-white/20 transition-all duration-300">
            {/* Quote mark */}
            <div className="text-teal-400/40 text-5xl font-serif leading-none mb-4">"</div>

            {/* Review text */}
            <p className="text-white/90 text-lg leading-relaxed mb-6 font-light">
              Mann I rock with the website heavy, was my first time actually trying a monetization method on my page and
              it did great. Everything was super easy and simple and also can't forget the help you guys provided.
              Definitely a great way to monetize quickly 🤝💯
            </p>

            {/* Author info */}
            <div className="flex items-center justify-between">
              <div className="text-white/60 text-sm font-light">@hustlmyndset</div>

              {/* Instagram link */}
              <a
                href="https://www.instagram.com/hustlmyndset?igsh=MWo5aGZtOGwxYzE4Zg=="
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all duration-300 group"
              >
                <Instagram className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
              </a>
            </div>
          </div>

          {/* Subtle glow effect on hover */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-500/5 to-cyan-400/5 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    </section>
  )
}
