import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  // ✅ DEV: отключаем защиту
  if (process.env.NEXT_PUBLIC_DISABLE_AUTH === '1') {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // защищаем всё под /layout-20
  if (pathname.startsWith('/layout-20')) {
    const token = req.cookies.get('access_token')?.value;

    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/layout-20/:path*'],
};