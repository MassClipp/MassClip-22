import type React from "react"

interface PremiumVideoCardProps {
  title: string
  thumbnailUrl: string
  price: number
}

const PremiumVideoCard: React.FC<PremiumVideoCardProps> = ({ title, thumbnailUrl, price }) => {
  return (
    <div className="premium-video-card">
      <img src={thumbnailUrl || "/placeholder.svg"} alt={title} className="premium-video-thumbnail" />
      <h3 className="premium-video-title">{title}</h3>
      <div className="premium-video-price">Price: ${price}</div>
    </div>
  )
}

export default PremiumVideoCard
