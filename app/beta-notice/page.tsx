export const metadata = {
  title: "Beta Notice | MassClip",
  description: "Information about MassClip's beta status",
}

export default function BetaNoticePage() {
  return (
    <div className="container max-w-3xl mx-auto px-4 py-16 md:py-24">
      <div className="space-y-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-light mb-4">MassClip Beta Notice</h1>
          <p className="text-amber-400 text-sm font-extralight tracking-widest">BETA</p>
        </div>

        <div className="space-y-8 text-white/80">
          <p className="text-xl">Thanks for being part of the early wave.</p>

          <p>
            MassClip is currently in beta, which means you're getting access to a fully usable platform while we
            continue to refine the experience. You might run into a few bugs or unfinished features, but everything you
            see is real, live, and improving every single week.
          </p>

          <div>
            <h2 className="text-2xl font-light text-white mb-4">Platform Stability</h2>
            <p>
              While the core functionality is in place — browsing, downloading, subscribing, and managing your account —
              you may notice small things being adjusted over time. This is part of our rapid development cycle as we
              scale up and polish the experience.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-light text-white mb-4">Password Reset Disclaimer</h2>
            <p>
              We are currently working on stabilizing the Forgot Password system. If you're having trouble resetting
              your password, please bear with us. We're aware of the issue and a fix is on the way. For now, if you're
              locked out, you may need to reach out directly until the system is fully functional.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-light text-white mb-4">Content & Features</h2>
            <p>
              More content is being added regularly across multiple categories, and new features will be rolled out
              soon. As an early user, you're helping shape the future of MassClip simply by being here.
            </p>
          </div>

          <div className="pt-8 border-t border-white/10">
            <h2 className="text-2xl font-light text-white mb-4">Appreciation</h2>
            <p>
              We appreciate your patience and support as we fine-tune the platform. Feel free to contact us at
              <a href="mailto:John@massclip.pro" className="text-amber-400 hover:text-amber-300 ml-1">
                John@massclip.pro
              </a>
            </p>
            <p className="mt-6 text-white/60">— MassClip Team</p>
          </div>
        </div>
      </div>
    </div>
  )
}
