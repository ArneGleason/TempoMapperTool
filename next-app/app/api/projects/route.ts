import { NextResponse } from 'next/server';
import { getSettings, DEFAULT_PROJECTS_DIR } from '@/lib/server-utils';
import fs from 'fs';
import path from 'path';

export async function GET() {
    try {
        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;

        if (!fs.existsSync(rootDir)) {
            return NextResponse.json([]);
        }

        const entries = fs.readdirSync(rootDir, { withFileTypes: true });
        const projects = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const projectPath = path.join(rootDir, dirent.name);
                const projectFile = path.join(projectPath, `${dirent.name}.tmt.json`);
                if (fs.existsSync(projectFile)) {
                    return {
                        name: dirent.name,
                        path: projectFile,
                        lastModified: fs.statSync(projectFile).mtime
                    };
                }
                return null;
            })
            .filter(p => p !== null)
            // @ts-ignore
            .sort((a, b) => b.lastModified - a.lastModified);

        return NextResponse.json(projects);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
    }
}
