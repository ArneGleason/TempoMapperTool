import { NextResponse } from 'next/server';
import { getSettings, DEFAULT_PROJECTS_DIR, updateRecents } from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, data } = body;

        if (!name) return NextResponse.json({ error: 'Project name required' }, { status: 400 });

        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;
        const projectDir = path.join(rootDir, name);

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const filename = `${name}.tmt.json`;
        const filePath = path.join(projectDir, filename);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updateRecents(filePath);

        return NextResponse.json({ status: 'success', path: filePath });
    } catch (e) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
