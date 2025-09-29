import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import Logo from "@/components/logo"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-black text-white p-6">
        <div className="container mx-auto flex items-center max-w-4xl">
          <Link href="/" className="flex items-center text-gray-400 hover:text-white mr-6">
            <ChevronLeft className="h-5 w-5 mr-1" />
            <span>Back</span>
          </Link>
          <Logo href="/" />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <article className="prose prose-gray max-w-none">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-thin text-black mb-4">Privacy Policy</h1>
            <p className="text-gray-600 text-lg">Effective Date: May 15, 2024</p>
          </div>

          <div className="bg-gray-50 p-8 rounded-lg mb-12">
            <p className="text-gray-700 text-lg leading-relaxed">
              At Vex, your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect
              your personal information when you use our services.
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                1. Information We Collect
              </h2>
              <div className="space-y-6">
                <p className="text-gray-700 leading-relaxed">
                  When you use Vex, we may collect the following types of information:
                </p>

                <div>
                  <h3 className="text-xl font-medium mb-3 text-black">Account Information</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Email address (required for registration)</li>
                    <li>Password (securely stored and encrypted)</li>
                    <li>Display name (optional)</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium mb-3 text-black">Payment Information</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>
                      Stripe handles all payments. We do not store your full credit card number or payment details.
                    </li>
                    <li>
                      We store your Stripe customer ID, subscription plan, and transaction metadata (e.g., timestamps,
                      plan type).
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-medium mb-3 text-black">Usage Data</h3>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>IP address, browser type, device type</li>
                    <li>Log-in activity and session times</li>
                    <li>Interaction with site features (e.g., downloaded clips, membership actions)</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                2. How We Use Your Information
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">We use your data strictly to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Provide access to the Vex platform</li>
                  <li>Manage user authentication and subscriptions</li>
                  <li>Improve the functionality and user experience</li>
                  <li>
                    Send service-related communications (e.g., login alerts, password resets, transaction confirmations)
                  </li>
                </ul>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-gray-700 font-medium">
                    We do not sell or rent your personal data to third parties.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                3. Cookies and Tracking
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  We use minimal cookies and analytics tools to better understand platform performance and usage.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>We do not use invasive third-party advertising trackers.</li>
                  <li>You may disable cookies in your browser, but it may affect functionality.</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                4. Sharing Your Information
              </h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  Your information is only shared with trusted providers essential to platform operation:
                </p>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Stripe (for payments)</li>
                    <li>Firebase (for authentication and database hosting)</li>
                    <li>Vercel (for deployment and error tracking)</li>
                  </ul>
                </div>
                <p className="text-gray-700 leading-relaxed">
                  Each partner has its own strict data security standards.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">5. Data Security</h2>
              <p className="text-gray-700 leading-relaxed">
                We use modern encryption protocols, access controls, and best practices to secure your data at rest and
                in transit.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">6. Your Rights</h2>
              <div className="space-y-4">
                <p className="text-gray-700 leading-relaxed">As a user, you have the right to:</p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Access your personal information</li>
                  <li>Correct or update your profile</li>
                  <li>Request deletion of your account and associated data</li>
                  <li>Unsubscribe from service-related emails (excluding essential notices)</li>
                </ul>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <p className="text-gray-700">
                    To exercise any of these rights, contact us at{" "}
                    <a href="mailto:contact@vex.com" className="text-blue-600 hover:underline font-medium">
                      contact@vex.com
                    </a>
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                7. Children's Privacy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                Vex is not intended for users under 13. We do not knowingly collect data from children under 13. If we
                become aware of such collection, we will delete the information immediately.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                8. International Users
              </h2>
              <p className="text-gray-700 leading-relaxed">
                This service is hosted in the United States but may be accessed globally. By using Vex, you consent to
                the processing and storage of your data in the U.S. and other countries where our services are hosted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">
                9. Changes to This Policy
              </h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy as the platform evolves. We will notify users via email or through the
                platform for any significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-light text-black mb-6 pb-2 border-b border-gray-200">10. Contact Us</h2>
              <div className="bg-gray-50 p-6 rounded-lg">
                <p className="text-gray-700 mb-2">
                  If you have questions or concerns about this Privacy Policy, contact us at:
                </p>
                <p className="text-black font-medium">
                  <a href="mailto:contact@vex.com" className="text-blue-600 hover:underline">
                    contact@vex.com
                  </a>
                </p>
              </div>
            </section>
          </div>
        </article>
      </main>

      <footer className="bg-gray-50 py-8 mt-16">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600">&copy; 2025 Vex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
