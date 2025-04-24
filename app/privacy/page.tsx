import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import Logo from "@/components/logo"

export default function PrivacyPage() {
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
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-white">MassClip Privacy Policy</h1>

          <div className="text-gray-400 mb-6">
            <p>Effective Date: {new Date().toLocaleDateString()}</p>
          </div>

          <p className="text-gray-200 mb-8">
            At MassClip, your privacy is important to us. This Privacy Policy outlines how we collect, use, and protect
            your personal information when you use our services.
          </p>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">1. Information We Collect</h2>
            <p className="text-gray-200 mb-4">
              When you use MassClip, we may collect the following types of information:
            </p>
            <h3 className="text-xl font-semibold mb-2 text-white">a. Account Information</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Email address (required for registration)</li>
              <li>Password (securely stored and encrypted)</li>
              <li>Display name (optional)</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 text-white">b. Payment Information</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Stripe handles all payments. We do not store your full credit card number or payment details.</li>
              <li>
                We store your Stripe customer ID, subscription plan, and transaction metadata (e.g., timestamps, plan
                type).
              </li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 text-white">c. Usage Data</h3>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>IP address, browser type, device type</li>
              <li>Log-in activity and session times</li>
              <li>Interaction with site features (e.g., downloaded clips, membership actions)</li>
            </ul>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">2. How We Use Your Information</h2>
            <p className="text-gray-200 mb-4">We use your data strictly to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Provide access to the MassClip platform</li>
              <li>Manage user authentication and subscriptions</li>
              <li>Improve the functionality and user experience</li>
              <li>
                Send service-related communications (e.g., login alerts, password resets, transaction confirmations)
              </li>
            </ul>
            <p className="text-gray-200">We do not sell or rent your personal data to third parties.</p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">3. Cookies and Tracking</h2>
            <p className="text-gray-200 mb-4">
              We use minimal cookies and analytics tools to better understand platform performance and usage.
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>We do not use invasive third-party advertising trackers.</li>
              <li>You may disable cookies in your browser, but it may affect functionality.</li>
            </ul>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">4. Sharing Your Information</h2>
            <p className="text-gray-200 mb-4">
              Your information is only shared with trusted providers essential to platform operation:
            </p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Stripe (for payments)</li>
              <li>Firebase (for authentication and database hosting)</li>
              <li>Vercel (for deployment and error tracking)</li>
            </ul>
            <p className="text-gray-200">Each partner has its own strict data security standards.</p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">5. Data Security</h2>
            <p className="text-gray-200">
              We use modern encryption protocols, access controls, and best practices to secure your data at rest and in
              transit.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">6. Your Rights</h2>
            <p className="text-gray-200 mb-4">As a user, you have the right to:</p>
            <ul className="list-disc pl-6 mb-4 text-gray-200">
              <li>Access your personal information</li>
              <li>Correct or update your profile</li>
              <li>Request deletion of your account and associated data</li>
              <li>Unsubscribe from service-related emails (excluding essential notices)</li>
            </ul>
            <p className="text-gray-200">
              To exercise any of these rights, contact us at{" "}
              <a href="mailto:massclipp@gmail.com" className="text-crimson hover:underline">
                massclipp@gmail.com
              </a>
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">7. Children&apos;s Privacy</h2>
            <p className="text-gray-200">
              MassClip is not intended for users under 13. We do not knowingly collect data from children under 13. If
              we become aware of such collection, we will delete the information immediately.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">8. International Users</h2>
            <p className="text-gray-200">
              This service is hosted in the United States but may be accessed globally. By using MassClip, you consent
              to the processing and storage of your data in the U.S. and other countries where our services are hosted.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">9. Changes to This Policy</h2>
            <p className="text-gray-200">
              We may update this Privacy Policy as the platform evolves. We will notify users via email or through the
              platform for any significant changes.
            </p>
          </section>

          <hr className="border-gray-800 my-8" />

          <section className="mb-10">
            <h2 className="text-2xl font-bold mb-4 text-white">10. Contact Us</h2>
            <p className="text-gray-200 mb-4">
              If you have questions or concerns about this Privacy Policy, contact us at:
            </p>
            <p className="text-gray-200 font-medium">
              <a href="mailto:massclipp@gmail.com" className="text-crimson hover:underline">
                massclipp@gmail.com
              </a>
            </p>
          </section>
        </article>
      </main>

      <footer className="relative z-10 container mx-auto px-4 py-8 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} MassClip. All rights reserved.</p>
      </footer>
    </div>
  )
}
