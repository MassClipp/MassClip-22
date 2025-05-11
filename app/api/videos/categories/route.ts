import { NextResponse } from "next/server"

// Mock data for categories
const categories = [
  "Introspection",
  "Hustle Mentality",
  "High Energy Motivation",
  "Faith",
  "Money & Wealth",
  "Motivational Speeches",
]

export async function GET() {
  return NextResponse.json({
    categories,
    total: categories.length,
  })
}
