import { NextResponse } from 'next/server';
import { getRecents } from '@/lib/server-utils';

export async function GET() {
    return NextResponse.json(getRecents());
}
