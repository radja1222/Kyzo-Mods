import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// PERHATIKAN: Nama fungsinya harus "proxy", BUKAN "middleware"
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
