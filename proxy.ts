import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Proxy runs on every request matching the config.matcher pattern.
// Two responsibilities:
//   1. Refresh the Supabase auth session (required by @supabase/ssr — without this,
//      Server Components can read a stale session from cookies).
//   2. Redirect unauthenticated users away from /admin/* to /login.
//
// SECURITY NOTE: this is a UX convenience layer. The actual authorization boundary
// is the RLS policies in Postgres. Never assume proxy is the last line of defence.

export async function proxy(request: NextRequest) {
  // Must be reassigned by setAll() so the response carries refreshed session cookies.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Forward refreshed cookies into both the request and the response so
          // Server Components downstream pick up the updated session.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: use getUser() not getSession(). getSession() re-uses the cookie
  // payload without validating it against the Supabase auth server, making it
  // unsuitable for access control decisions in proxy.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Unauthenticated → redirect to login, preserving the intended destination.
  if (!user && pathname.startsWith('/admin')) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Already authenticated → skip the login page.
  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return supabaseResponse
}

export const config = {
  // Run on all routes except static files and Next.js internals.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
