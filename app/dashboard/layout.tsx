import type React from "react"
import Sidebar from "@/app/ui/dashboard/sidebar/sidebar"
import Navbar from "@/app/ui/dashboard/navbar/navbar"

export default function Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <div className="w-64">
        <Sidebar />
      </div>
      <div className="flex-1">
        <Navbar />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
