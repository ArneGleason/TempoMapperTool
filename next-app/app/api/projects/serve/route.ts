import { NextResponse } from 'next/server';
import { getSettings, DEFAULT_PROJECTS_DIR } from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';
// import mime from 'mime-types'; // Can't easily import unless installed. We'll use basic mapping or just application/octet-stream if unknown.

function getContentType(ext: string) {
    const map: any = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg'
    };
    return map[ext] || 'application/octet-stream';
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    const file = searchParams.get('file');

    if (!project || !file) {
        return new NextResponse('Missing params', { status: 400 });
    }

    const settings = getSettings();
    const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;
    // Security check: ensure no directory traversal
    const safeProject = path.normalize(project).replace(/^(\.\.[\/\\])+/, '');
    const safeFile = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');

    const filePath = path.join(rootDir, safeProject, safeFile);

    if (!fs.existsSync(filePath)) {
        return new NextResponse('File not found', { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': getContentType(ext),
            'Content-Length': fileBuffer.length.toString()
        }
    });
}
