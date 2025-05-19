import { NextResponse } from "next/server"

export async function POST() {
  const res = NextResponse.json({ status: "success" })
  res.cookies.set("session", "", {
    maxAge: 0,
    httpOnly: true,
    secure: true,
    path: "/",
  })
  return res
}
