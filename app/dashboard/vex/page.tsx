"use client"

import { VexChat } from "@/components/vex-chat"
import { PaywallWrapper } from "@/components/paywall-wrapper"

export default function VexPage() {
  return (
    <PaywallWrapper>
      <VexChat />
    </PaywallWrapper>
  )
}
