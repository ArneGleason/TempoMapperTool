import { NextResponse } from 'next/server';
import { getSettings, DEFAULT_PROJECTS_DIR } from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const projectName = formData.get('projectName') as string;

        if (!file || !projectName) {
            return NextResponse.json({ error: 'Missing file or project name' }, { status: 400 });
        }

        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;
        const projectDir = path.join(rootDir, projectName);

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const targetPath = path.join(projectDir, file.name);

        fs.writeFileSync(targetPath, buffer);

        // API is hosted on same domain, so URL is /projects/[ProjectName]/[FileName]
        // But Next.js doesn't serve from FS automatically unless in public.
        // We implemented a custom Route Handler for serving static files in Express.
        // In Next.js, we can create a Route Handler [..path] to serve these, OR just return /api/projects/file?path=...
        // Let's use a serve route: /api/projects/serve?file=...
        // const fileUrl = `/api/projects/serve?project=${projectName}&file=${file.name}`;
        // Wait, for Audio `src`, we need a URL.
        const fileUrl = `/api/projects/serve?project=${encodeURIComponent(projectName)}&file=${encodeURIComponent(file.name)}`;

        return NextResponse.json({ status: 'success', url: fileUrl, path: targetPath });
    } catch (e) {
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
