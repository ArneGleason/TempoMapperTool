import { NextResponse } from 'next/server';
import { getSettings, saveSettings } from '@/lib/server-utils';
import fs from 'fs';

export async function GET() {
    const settings = getSettings();
    return NextResponse.json(settings);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { rootFolder } = body;

        if (rootFolder) {
            if (!fs.existsSync(rootFolder)) {
                fs.mkdirSync(rootFolder, { recursive: true });
            }
            const settings = getSettings();
            settings.rootFolder = rootFolder;
            saveSettings(settings);
            return NextResponse.json({ status: 'success', settings });
        }
        return NextResponse.json({ error: 'Missing rootFolder' }, { status: 400 });
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
