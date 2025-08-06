import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // This route is deprecated - redirect to the new secure callback
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Build new URL with all parameters
  const newUrl = new URL('/api/stripe/connect-callback', request.url)
  
  if (code) newUrl.searchParams.set('code', code)
  if (state) newUrl.searchParams.set('state', state)
  if (error) newUrl.searchParams.set('error', error)
  if (errorDescription) newUrl.searchParams.set('error_description', errorDescription)

  return NextResponse.redirect(newUrl)
}
