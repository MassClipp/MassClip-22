import Link from "next/link"
import { Button } from "@/components/ui/button"
import Logo from "@/components/logo"

export default function LandingHeader() {
  return (
    <header className="fixed top-0 w-full z-50 bg-transparent">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <Logo size="md" />

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10">
              Log in
            </Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-red-600 hover:bg-red-700 text-white">Sign up</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
