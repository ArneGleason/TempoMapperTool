const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allow large project files

// Data Storage Paths
const PROJECTS_DIR = path.join(__dirname, 'projects');
const RECENTS_FILE = path.join(__dirname, 'recent_projects.json');

// Ensure directories exist
if (!fs.existsSync(PROJECTS_DIR)) fs.mkdirSync(PROJECTS_DIR);
if (!fs.existsSync(RECENTS_FILE)) fs.writeFileSync(RECENTS_FILE, JSON.stringify([]));

// Helpers
const getRecents = () => JSON.parse(fs.readFileSync(RECENTS_FILE, 'utf8'));
const saveRecents = (recents) => fs.writeFileSync(RECENTS_FILE, JSON.stringify(recents, null, 2));

const updateRecents = (filePath) => {
    let recents = getRecents();
    // Remove if exists, add to top
    recents = recents.filter(p => p.path !== filePath);
    recents.unshift({ path: filePath, name: path.basename(filePath, '.json'), lastOpened: new Date() });
    // Keep top 5
    if (recents.length > 5) recents = recents.slice(0, 5);
    saveRecents(recents);
};

// --- API Endpoints ---

// Health
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Get Recent Projects
app.get('/api/projects/recent', (req, res) => {
    try {
        const recents = getRecents();
        res.json(recents);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load recents' });
    }
});

// Save Project (Simulated to a local projects folder for now, or arbitrary path if we could)
// In a real desktop app we'd use Electron dialogs. Here, we'll save to our server folder by name.
app.post('/api/projects/save', (req, res) => {
    try {
        const { name, data } = req.body;
        const filename = name.endsWith('.json') ? name : `${name}.json`;
        const filePath = path.join(PROJECTS_DIR, filename);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        updateRecents(filePath);

        res.json({ status: 'success', path: filePath });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// Load Project
app.post('/api/projects/load', (req, res) => {
    try {
        const { path: filePath } = req.body; // Full path or filename

        // Security check omitted for prototype (allow reading any file for "Open" intent)
        // ideally we restrict or use a dialog in frontend that sends content

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
    console.log(`Projects Dir: ${PROJECTS_DIR}`);
});
