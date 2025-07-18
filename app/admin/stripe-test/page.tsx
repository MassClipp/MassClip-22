import dynamic from "next/dynamic"

const StripeTestClientPage = dynamic(() => import("./StripeTestClientPage"), { ssr: false })

export default function StripeTestPage() {
  return <StripeTestClientPage />
}
