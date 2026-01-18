import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const SETTINGS_FILE = path.join(process.cwd(), 'settings.json');
const RECENTS_FILE = path.join(process.cwd(), 'recent_projects.json');

// Helper to get real Documents path on Windows
export const getDocumentsPath = () => {
    if (process.platform === 'win32') {
        try {
            const output = execSync('powershell -Command "[Environment]::GetFolderPath(\'MyDocuments\')"', { encoding: 'utf8', stdio: 'pipe' });
            const trimmed = output.trim();
            if (trimmed && fs.existsSync(trimmed)) return trimmed;
        } catch (e) {
            console.error("Failed to resolve Documents path via PowerShell", e);
        }
    }
    return path.join(os.homedir(), 'Documents');
};

export const DEFAULT_PROJECTS_DIR = path.join(getDocumentsPath(), 'TempoMapMaker', 'Projects');

export const getSettings = () => {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
            if (!settings.rootFolder) settings.rootFolder = DEFAULT_PROJECTS_DIR;
            return settings;
        }
    } catch (e) { }
    // Default
    return { rootFolder: DEFAULT_PROJECTS_DIR };
};

export const saveSettings = (settings: any) => {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
};

export const getRecents = () => {
    try {
        if (fs.existsSync(RECENTS_FILE)) {
            return JSON.parse(fs.readFileSync(RECENTS_FILE, 'utf8'));
        }
    } catch (e) { }
    return [];
};

export const updateRecents = (filePath: string) => {
    let recents = getRecents();
    recents = recents.filter((p: any) => p.path !== filePath);
    recents.unshift({ path: filePath, name: path.basename(filePath), lastOpened: new Date() });
    if (recents.length > 10) recents = recents.slice(0, 10);
    fs.writeFileSync(RECENTS_FILE, JSON.stringify(recents, null, 2));
};
