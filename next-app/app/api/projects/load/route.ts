import { NextResponse } from 'next/server';
import { updateRecents } from '@/lib/server-utils';
import fs from 'fs';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { path: filePath } = body;

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        const data = fs.readFileSync(filePath, 'utf8');
        updateRecents(filePath);

        return NextResponse.json(JSON.parse(data));
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
