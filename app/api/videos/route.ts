import { NextResponse } from "next/server"

// Mock data for videos
const mockVideos = [
  {
    id: "video1",
    title: "High Energy Motivation",
    description: "Get motivated with this high energy clip",
    thumbnailUrl: "/vibrant-morning-start.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["motivation", "energy", "success"],
    categories: ["High Energy Motivation"],
  },
  {
    id: "video2",
    title: "Hustle Mentality",
    description: "Develop your hustle mentality",
    thumbnailUrl: "/focused-creator.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["hustle", "grind", "success"],
    categories: ["Hustle Mentality"],
  },
  {
    id: "video3",
    title: "Introspection Journey",
    description: "Take a journey of self-reflection",
    thumbnailUrl: "/cozy-morning-prep.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["introspection", "reflection", "mindfulness"],
    categories: ["Introspection"],
  },
  {
    id: "video4",
    title: "Faith and Belief",
    description: "Strengthen your faith and belief",
    thumbnailUrl: "/focused-work-session.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["faith", "belief", "spirituality"],
    categories: ["Faith"],
  },
  {
    id: "video5",
    title: "Money & Wealth Principles",
    description: "Learn principles of wealth building",
    thumbnailUrl: "/dynamic-workout-flow.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["money", "wealth", "finance"],
    categories: ["Money & Wealth"],
  },
  {
    id: "video6",
    title: "Motivational Speech",
    description: "Get inspired with this motivational speech",
    thumbnailUrl: "/dynamic-fitness-flow.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["motivation", "speech", "inspiration"],
    categories: ["Motivational Speeches"],
  },
  {
    id: "video7",
    title: "Success Mindset",
    description: "Develop a success mindset",
    thumbnailUrl: "/vibrant-social-cta.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["success", "mindset", "achievement"],
    categories: ["High Energy Motivation", "Hustle Mentality"],
  },
  {
    id: "video8",
    title: "Daily Reflection",
    description: "Practice daily reflection for inner peace",
    thumbnailUrl: "/vibrant-salad-intro.png",
    videoUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    downloadUrl: "/copy_2EEDCAE6-EBA4-4D3F-B5AB-F20A3A7E6E5E.mp4",
    tags: ["reflection", "peace", "mindfulness"],
    categories: ["Introspection"],
  },
]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number.parseInt(searchParams.get("page") || "1")
  const perPage = Number.parseInt(searchParams.get("per_page") || "20")

  // Calculate pagination
  const start = (page - 1) * perPage
  const end = start + perPage
  const paginatedVideos = mockVideos.slice(start, end)
  const hasMore = end < mockVideos.length

  return NextResponse.json({
    videos: paginatedVideos,
    hasMore,
    total: mockVideos.length,
    page,
    perPage,
  })
}
