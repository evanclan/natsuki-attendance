import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
    const { supabaseResponse, user } = await updateSession(request)

    const url = request.nextUrl.clone()
    const isAdminRoute = url.pathname.startsWith('/admin')
    const isLoginRoute = url.pathname.startsWith('/login')
    const isKioskRoute = url.pathname.startsWith('/kiosk')

    // Allow public access to kiosk routes
    if (isKioskRoute) {
        return supabaseResponse
    }

    // Redirect unauthenticated users trying to access admin routes to login
    if (isAdminRoute && !user) {
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect authenticated users away from login page to admin
    if (isLoginRoute && user) {
        url.pathname = '/admin'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
