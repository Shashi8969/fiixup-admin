// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient }             from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Always allow these paths ──────────────────────────────────────────────
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // ── Build response so we can mutate cookies ────────────────────────────────
  let response = NextResponse.next({ request })

  // ── Create Supabase server client with cookie handling ─────────────────────
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({ request })
            response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
          })
        },
      },
    }
  )

  // ── Check session ──────────────────────────────────────────────────────────
  // getUser() re-validates the token against the Auth server on every request.
  // getSession() only decodes the cookie locally and does not verify it, so a
  // tampered/forged cookie could otherwise pass this check.
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = new URL('/login', request.url)
    // Only set ?next= for non-root paths to avoid loops
    if (pathname !== '/' && pathname !== '/dashboard') {
      loginUrl.searchParams.set('next', pathname)
    }
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}