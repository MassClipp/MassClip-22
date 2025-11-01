"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, Package, DollarSign, Store, Upload, Heart, ShoppingBag, Gift, MessageSquare } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const businessManagementItems = [
  {
    title: "Sales Objectives",
    url: "/dashboard/sales-objectives",
    icon: DollarSign,
  },
  {
    title: "Bundles",
    url: "/dashboard/bundles",
    icon: Package,
  },
  {
    title: "Earnings",
    url: "/dashboard/earnings",
    icon: DollarSign,
  },
  {
    title: "View Storefront",
    url: "/dashboard/view-storefront",
    icon: Store,
  },
  {
    title: "eBook",
    url: "/dashboard/ebook",
    icon: BookOpen,
  },
]

const navigationItems = [
  {
    title: "Upload",
    url: "/dashboard/upload",
    icon: Upload,
  },
  {
    title: "Favorites",
    url: "/dashboard/favorites",
    icon: Heart,
  },
  {
    title: "My Purchases",
    url: "/dashboard/purchases",
    icon: ShoppingBag,
  },
  {
    title: "Free Content",
    url: "/dashboard/free-content",
    icon: Gift,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">MassClip</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Business Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {businessManagementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
