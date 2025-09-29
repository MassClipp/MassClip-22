import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black text-white p-6">
        <div className="container mx-auto flex items-center max-w-4xl">
          <Link href="/" className="flex items-center text-gray-400 hover:text-white mr-6">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </Link>
          <div className="text-white font-light text-2xl">
            <span className="font-league-spartan font-bold" style={{ fontFamily: "var(--font-league-spartan)" }}>
              MassClip
            </span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <article className="prose prose-gray max-w-none">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-thin text-black mb-4">Terms of Service</h1>
            <p className="text-gray-600 text-lg">Effective Date: May 15, 2024</p>
          </div>

          <div className="bg-gray-50 p-8 rounded-lg mb-12">
            <p className="text-gray-700 text-lg leading-relaxed">
              Welcome to MassClip. By accessing or using our platform, you agree to be bound by the following Terms of
              Service. If you do not agree, please do not use our platform.
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">1. Overview</h2>
              <p className="text-gray-700 leading-relaxed">
                MassClip is a digital platform that provides downloadable content (primarily video clips) to faceless
                creators, theme pages, and online brands. These clips are curated and sourced from publicly available
                content for the purposes of commentary, education, inspiration, parody, and other transformative uses.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">2. User Eligibility</h2>
              <p className="text-gray-700 leading-relaxed">
                To use MassClip, you must be at least 18 years old or the age of majority in your jurisdiction. You
                agree to provide accurate and complete registration information and to update it as needed.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                3. Content Ownership & Fair Use
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  MassClip does not claim ownership over any third-party content displayed or available for download on
                  the platform unless explicitly stated.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We operate as a distribution platform, providing access to curated clips that are believed to fall
                  under fair use under U.S. copyright law. These include but are not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Motivational segments</li>
                  <li>Commentary excerpts</li>
                  <li>Culturally significant moments</li>
                  <li>Educational or transformative use cases</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  All third-party clips include name-based attribution where available. We do not misrepresent
                  ownership, and we do not claim affiliation with the original creators unless otherwise stated.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                4. Use of the Platform
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  You may use clips for content creation, social media publishing, theme pages, and other forms of
                  digital storytelling. However, redistribution or resale of unaltered clips is strictly prohibited.
                </p>
                <p className="text-gray-700 leading-relaxed">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Use the platform for illegal or infringing purposes</li>
                  <li>Re-upload clips elsewhere in bulk</li>
                  <li>Scrape or clone the platform's content without permission</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                5. Memberships & Payments
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Users may purchase memberships through third-party payment processors (e.g. Stripe). All payments are
                final unless otherwise stated. You are responsible for maintaining an active subscription if you wish to
                continue accessing premium content.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">6. Data & Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                We collect your email, membership status, and basic usage data to improve user experience. Your
                information is stored securely and never sold. See our Privacy Policy for full details.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                7. DMCA & Copyright Policy
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  If you are a content owner and believe your copyrighted material appears on MassClip in violation of
                  your rights, you may submit a takedown request under the Digital Millennium Copyright Act (DMCA).
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700 mb-2">To file a DMCA request, email:</p>
                  <p className="text-black font-medium mb-2">contact@massclip.pro</p>
                  <p className="text-gray-700 mb-2">Subject: "DMCA Takedown Request"</p>
                </div>
                <p className="text-gray-700 leading-relaxed">Include:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Your full legal name</li>
                  <li>A description of the content in question</li>
                  <li>The exact URL(s) where the material appears</li>
                  <li>Proof of ownership</li>
                  <li>A statement that you are the copyright owner or authorized to act on their behalf</li>
                </ul>
                <p className="text-gray-700 leading-relaxed">
                  Upon verification, we will promptly remove or restrict access to the content in question.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                8. Limitation of Liability
              </h2>
              <p className="text-gray-700 leading-relaxed">
                MassClip is provided "as-is" without warranties of any kind. We are not liable for any direct, indirect,
                incidental, or consequential damages arising from your use of the platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">9. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update these terms at any time. Continued use of the platform after changes signifies your
                acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">10. Contact</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">For support, legal inquiries, or business questions:</p>
                <p className="text-black font-medium">Email: contact@massclip.pro</p>
              </div>
            </section>
          </div>
        </article>
      </main>

      <footer className="bg-gray-50 py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600">&copy; 2025 MassClip. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
