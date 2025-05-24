import type React from "react"

interface CreatorProfileWithSidebarProps {
  creatorName: string
  creatorDescription: string
  profileImageUrl: string
  sidebarContent: React.ReactNode
  pricingInformation?: {
    basicPlanPrice: number
    premiumPlanPrice: number
  }
}

const CreatorProfileWithSidebar: React.FC<CreatorProfileWithSidebarProps> = ({
  creatorName,
  creatorDescription,
  profileImageUrl,
  sidebarContent,
  pricingInformation,
}) => {
  return (
    <div className="flex">
      {/* Sidebar */}
      <div className="w-1/4 p-4">{sidebarContent}</div>

      {/* Main Content */}
      <div className="w-3/4 p-4">
        <div className="flex items-center mb-4">
          <img src={profileImageUrl || "/placeholder.svg"} alt={creatorName} className="rounded-full w-20 h-20 mr-4" />
          <div>
            <h1 className="text-2xl font-bold">{creatorName}</h1>
            <p className="text-gray-600">{creatorDescription}</p>
          </div>
        </div>

        {/* Pricing Information (Conditionally Rendered) */}
        {pricingInformation && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold mb-2">Pricing</h2>
            <p>Basic Plan: ${pricingInformation.basicPlanPrice}</p>
            <p>Premium Plan: ${pricingInformation.premiumPlanPrice}</p>
          </div>
        )}

        {/* Rest of the creator profile content can go here */}
        <div>
          {/* Example Content */}
          <p>More content about the creator...</p>
        </div>
      </div>
    </div>
  )
}

export default CreatorProfileWithSidebar
