import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// PERHATIKAN: Nama fungsi harus 'proxy', bukan 'middleware'
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
