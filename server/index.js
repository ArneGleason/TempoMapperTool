const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const os = require('os');
const { execSync } = require('child_process');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large project files

// Data Storage Paths

const getDocumentsPath = () => {
    if (process.platform === 'win32') {
        try {
            // Use PowerShell to get the real 'MyDocuments' path (handles OneDrive etc)
            const output = execSync('powershell -Command "[Environment]::GetFolderPath(\'MyDocuments\')"', { encoding: 'utf8', stdio: 'pipe' });
            const trimmed = output.trim();
            if (trimmed && fs.existsSync(trimmed)) return trimmed;
        } catch (e) {
            console.error("Failed to resolve Documents path via PowerShell:", e.message);
        }
    }
    return path.join(os.homedir(), 'Documents');
};

// Default to 'Documents/TempoMapMaker/Projects' (Real Path)
const DOCUMENTS_PATH = getDocumentsPath();
const DEFAULT_PROJECTS_DIR = path.join(DOCUMENTS_PATH, 'TempoMapMaker', 'Projects');
const OLD_DEFAULT_PROJECTS_DIR = path.join(__dirname, 'projects');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const RECENTS_FILE = path.join(__dirname, 'recent_projects.json');

// Ensure defaults
if (!fs.existsSync(DEFAULT_PROJECTS_DIR)) fs.mkdirSync(DEFAULT_PROJECTS_DIR, { recursive: true });
if (!fs.existsSync(RECENTS_FILE)) fs.writeFileSync(RECENTS_FILE, JSON.stringify([]));

// Migration: Check if settings exists. If it points to OLD default, update to NEW default.
if (fs.existsSync(SETTINGS_FILE)) {
    try {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        if (settings.rootFolder === OLD_DEFAULT_PROJECTS_DIR) {
            settings.rootFolder = DEFAULT_PROJECTS_DIR;
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
            console.log('Migrated default project path to Documents folder.');
        }
    } catch (e) {
        console.error("Migration check failed", e);
    }
} else {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ rootFolder: DEFAULT_PROJECTS_DIR }));
}

// Helpers
const getSettings = () => {
    try {
        const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        if (!settings.rootFolder) settings.rootFolder = DEFAULT_PROJECTS_DIR;
        return settings;
    } catch (e) {
        return { rootFolder: DEFAULT_PROJECTS_DIR };
    }
};

const saveSettings = (settings) => fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));

const getRecents = () => {
    try {
        return JSON.parse(fs.readFileSync(RECENTS_FILE, 'utf8'));
    } catch (e) { return []; }
};
const saveRecents = (recents) => fs.writeFileSync(RECENTS_FILE, JSON.stringify(recents, null, 2));

const updateRecents = (filePath) => {
    let recents = getRecents();
    // Remove if exists, add to top
    recents = recents.filter(p => p.path !== filePath);
    // Name is the folder name usually, or file base name
    const name = path.basename(filePath, '.tmt.json').replace('.tmt', ''); // Handle double extension if needed, but usually basename handles the last one.
    // actually path.basename('foo.tmt.json', '.tmt.json') -> 'foo'
    // Let's just use the filename for now.

    recents.unshift({ path: filePath, name: path.basename(filePath), lastOpened: new Date() });
    // Keep top 10
    if (recents.length > 10) recents = recents.slice(0, 10);
    saveRecents(recents);
};

// --- API Endpoints ---

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Settings
app.get('/api/settings', (req, res) => {
    res.json(getSettings());
});

app.post('/api/settings', (req, res) => {
    const { rootFolder } = req.body;
    if (rootFolder) {
        // Ensure it exists? Or create it?
        // For security/validity, maybe check if it's a valid path format.
        // We'll trust the user has filesystem access to the path they provide.
        if (!fs.existsSync(rootFolder)) {
            try {
                fs.mkdirSync(rootFolder, { recursive: true });
            } catch (e) {
                return res.status(500).json({ error: 'Could not create root folder' });
            }
        }
        const settings = getSettings();
        settings.rootFolder = rootFolder;
        saveSettings(settings);
        res.json({ status: 'success', settings });
    } else {
        res.status(400).json({ error: 'Missing rootFolder' });
    }
});

// Get Recent Projects
app.get('/api/projects/recent', (req, res) => {
    try {
        const recents = getRecents();
        res.json(recents);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load recents' });
    }
});

// Save Project
app.post('/api/projects/save', (req, res) => {
    try {
        const { name, data } = req.body; // name is "ProjectName" (e.g. "MySong")
        if (!name) return res.status(400).json({ error: 'Project name required' });

        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;

        // Structure: rootDir / [ProjectName] / [ProjectName].tmt.json
        const projectDir = path.join(rootDir, name);

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const filename = `${name}.tmt.json`;
        const filePath = path.join(projectDir, filename);

        // Optional: Save backup if exists? For now overwrite.
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updateRecents(filePath);

        res.json({ status: 'success', path: filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// List Projects (Folders in Root)
app.get('/api/projects', (req, res) => {
    try {
        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;

        if (!fs.existsSync(rootDir)) {
            return res.json([]);
        }

        const entries = fs.readdirSync(rootDir, { withFileTypes: true });
        const projects = entries
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                // Check if .tmt.json exists inside?
                // For performance, just list folders for now, or check efficiently.
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
            // Sort by modified desc
            .sort((a, b) => b.lastModified - a.lastModified);

        res.json(projects);
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

const multer = require('multer');

// ... (existing imports)

// Temp Uploads Dir
const TEMP_UPLOADS_DIR = path.join(__dirname, 'temp_uploads');
if (!fs.existsSync(TEMP_UPLOADS_DIR)) fs.mkdirSync(TEMP_UPLOADS_DIR);

const upload = multer({ dest: TEMP_UPLOADS_DIR });

// Serve Projects Statically (Dynamic Root)
app.use('/projects', (req, res, next) => {
    const settings = getSettings();
    const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;
    // Prevent directory traversal
    const safePath = path.normalize(req.path).replace(/^(\.\.[\/\\])+/, '');
    const absolutePath = path.join(rootDir, safePath);

    if (fs.existsSync(absolutePath)) {
        res.sendFile(absolutePath);
    } else {
        res.status(404).send('Not found');
    }
});

// ... (existing endpoints)

// Upload File
app.post('/api/projects/upload', upload.single('file'), (req, res) => {
    try {
        const { projectName } = req.body;
        const file = req.file;

        if (!projectName || !file) {
            return res.status(400).json({ error: 'Missing project name or file' });
        }

        const settings = getSettings();
        const rootDir = settings.rootFolder || DEFAULT_PROJECTS_DIR;
        const projectDir = path.join(rootDir, projectName);

        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        const targetPath = path.join(projectDir, file.originalname);

        // Move file
        fs.renameSync(file.path, targetPath);

        // Return public URL (relative to server origin)
        // URL: /projects/[ProjectName]/[FileName]
        const fileUrl = `http://localhost:${PORT}/projects/${projectName}/${file.originalname}`;

        res.json({ status: 'success', url: fileUrl, path: targetPath });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Load Project
app.post('/api/projects/load', (req, res) => {
    try {
        const { path: filePath } = req.body;
        // ... (existing logic)
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        const data = fs.readFileSync(filePath, 'utf8');
        updateRecents(filePath);

        res.json(JSON.parse(data));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to load project' });
    }
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Default Projects Dir: ${DEFAULT_PROJECTS_DIR}`);
});
