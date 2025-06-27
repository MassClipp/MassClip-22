"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Gauge, Upload, PlayCircle } from "lucide-react"

/**
 * DashboardSidebar — temporary build with membership link removed.
 * To restore, delete the `TEMPORARY UI TWEAK` section and reinstate the link.
 */
const navItems = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/dashboard/uploads", label: "Uploads", icon: Upload },
  { href: "/dashboard/explore", label: "Explore", icon: PlayCircle },
  // 🔒 TEMPORARY UI TWEAK: membership page hidden
  // { href: "/dashboard/membership", label: "Membership", icon: Star },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col gap-1 p-4 w-60">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded px-3 py-2 hover:bg-muted transition",
            pathname === href && "bg-muted text-primary",
          )}
        >
          <Icon size={18} />
          <span>{label}</span>
        </Link>
      ))}
    </aside>
  )
}
