import { NextResponse } from 'next/server'

export async function GET(request) {
  const url = new URL('/', request.url)
  const response = NextResponse.redirect(url)
  response.cookies.set('preview_access', '', { maxAge: 0, path: '/' })
  return response
}
