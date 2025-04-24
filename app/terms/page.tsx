import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import Logo from "@/components/logo"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Static Gradient Background */}
      <div className="fixed inset-0 z-0 static-gradient-bg"></div>

      <header className="relative z-10 w-full p-6">
        <div className="container mx-auto flex items-center">
          <Link href="/" className="flex items-center text-gray-400 hover:text-white mr-4">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </Link>
          <Logo href="/" />
        </div>
      </header>

      <main className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        <article className="prose prose-invert prose-lg max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white">MassClip Terms of Service</h1>

          <div className="text-gray-400 mb-6">
            <p>Effective Date: {new Date().toLocaleDateString()}</p>
          </div>

          <p className="text-gray-200 mb-8">
            Welcome to MassClip. By accessing or using our platform, you agree to be bound by the following Terms of
            Service. If you do not agree, please do not use our platform.
          </p>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">1. Overview</h2>
            <p className="text-gray-200">
              MassClip is a digital platform that provides downloadable content (primarily video clips) to faceless
              creators, theme pages, and online brands. These clips are curated and sourced from publicly available
              content for the purposes of commentary, education, inspiration, parody, and other transformative uses.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">2. User Eligibility</h2>
            <p className="text-gray-200">
              To use MassClip, you must be at least 18 years old or the age of majority in your jurisdiction. You agree
              to provide accurate and complete registration information and to update it as needed.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">3. Content Ownership & Fair Use</h2>
            <p className="text-gray-200 mb-4">
              MassClip does not claim ownership over any third-party content displayed or available for download on the
              platform unless explicitly stated.
            </p>
            <p className="text-gray-200 mb-4">
              We operate as a distribution platform, providing access to curated clips that are believed to fall under
              fair use under U.S. copyright law. These include but are not limited to:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Motivational segments</li>
              <li>Commentary excerpts</li>
              <li>Culturally significant moments</li>
              <li>Educational or transformative use cases</li>
            </ul>
            <p className="text-gray-200">
              All third-party clips include name-based attribution where available. We do not misrepresent ownership,
              and we do not claim affiliation with the original creators unless otherwise stated.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">4. Use of the Platform</h2>
            <p className="text-gray-200 mb-4">
              You may use clips for content creation, social media publishing, theme pages, and other forms of digital
              storytelling. However, redistribution or resale of unaltered clips is strictly prohibited.
            </p>
            <p className="text-gray-200 mb-4">You agree not to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Use the platform for illegal or infringing purposes</li>
              <li>Re-upload clips elsewhere in bulk</li>
              <li>Scrape or clone the platform's content without permission</li>
            </ul>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">5. Memberships & Payments</h2>
            <p className="text-gray-200">
              Users may purchase memberships through third-party payment processors (e.g. Stripe). All payments are
              final unless otherwise stated. You are responsible for maintaining an active subscription if you wish to
              continue accessing premium content.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">6. Data & Privacy</h2>
            <p className="text-gray-200">
              We collect your email, membership status, and basic usage data to improve user experience. Your
              information is stored securely and never sold. See our Privacy Policy for full details.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">7. DMCA & Copyright Policy</h2>
            <p className="text-gray-200 mb-4">
              If you are a content owner and believe your copyrighted material appears on MassClip in violation of your
              rights, you may submit a takedown request under the Digital Millennium Copyright Act (DMCA).
            </p>
            <p className="text-gray-200 mb-4">To file a DMCA request, email:</p>
            <p className="text-gray-200 mb-4 font-medium">massclipp@gmail.com</p>
            <p className="text-gray-200 mb-4">Subject: "DMCA Takedown Request"</p>
            <p className="text-gray-200 mb-4">Include:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Your full legal name</li>
              <li>A description of the content in question</li>
              <li>The exact URL(s) where the material appears</li>
              <li>Proof of ownership</li>
              <li>A statement that you are the copyright owner or authorized to act on their behalf</li>
            </ul>
            <p className="text-gray-200">
              Upon verification, we will promptly remove or restrict access to the content in question.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">8. Limitation of Liability</h2>
            <p className="text-gray-200">
              MassClip is provided "as-is" without warranties of any kind. We are not liable for any direct, indirect,
              incidental, or consequential damages arising from your use of the platform.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">9. Changes to Terms</h2>
            <p className="text-gray-200">
              We may update these terms at any time. Continued use of the platform after changes signifies your
              acceptance of the updated terms.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">10. Contact</h2>
            <p className="text-gray-200 mb-4">For support, legal inquiries, or business questions:</p>
            <p className="text-gray-200 font-medium">Email: massclipp@gmail.com</p>
          </section>
        </article>
      </main>

      <footer className="relative z-10 container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} MassClip. All rights reserved.</p>
      </footer>
    </div>
  )
}
