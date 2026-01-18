import { useProject } from '../contexts/ProjectContext';

// Actions
const API_BASE = '/api';

export const useProjectActions = () => {
    const { addAudioTrack } = useProject();

    // In a real app we'd probably consume a ProjectContext to get current state

    const saveProject = async (name, projectData) => {
        try {
            // Process tracks to upload files
            const processedTracks = await Promise.all(projectData.tracks.map(async (track) => {
                if (track.type === 'AUDIO' && track.file) {
                    // Upload File
                    const formData = new FormData();
                    formData.append('projectName', name);
                    formData.append('file', track.file);

                    try {
                        const uploadRes = await fetch(`${API_BASE}/projects/upload`, {
                            method: 'POST',
                            body: formData
                        });
                        const uploadData = await uploadRes.json();
                        if (uploadData.status === 'success') {
                            // Return track with new src and NO file object
                            const { file, ...rest } = track;
                            return { ...rest, src: uploadData.url };
                        }
                    } catch (uploadErr) {
                        console.error("Failed to upload file for track", track.title, uploadErr);
                        // If upload fails, keep original (will fail to load later but at least saves structure)
                    }
                }
                // Strip file object from other tracks too if present
                const { file, ...rest } = track;
                return rest;
            }));

            // Create new data object with processed tracks
            const dataToSave = { ...projectData, tracks: processedTracks };

            const res = await fetch(`${API_BASE}/projects/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: dataToSave })
            });
            return await res.json();
        } catch (e) {
            console.error('Save failed', e);
        }
    };

    const loadProject = async (path) => {
        try {
            const res = await fetch(`${API_BASE}/projects/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            return await res.json();
        } catch (e) {
            console.error('Load failed', e);
        }
    };

    const importAudio = () => {
        // Trigger a hidden file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'audio/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                addAudioTrack(file);
            }
        };
        input.click();
    };

    const getSettings = async () => {
        try {
            const res = await fetch(`${API_BASE}/settings`);
            if (!res.ok) return {};
            return await res.json();
        } catch (e) { console.error(e); return {}; }
    };

    const saveSettings = async (settings) => {
        try {
            const res = await fetch(`${API_BASE}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            return await res.json();
        } catch (e) { console.error(e); }
    };

    const getProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects`);
            return await res.json();
        } catch (e) { console.error(e); return []; }
    };

    const getRecentProjects = async () => {
        try {
            const res = await fetch(`${API_BASE}/projects/recent`);
            return await res.json();
        } catch (e) { console.error(e); return []; }
    };

    return { saveProject, loadProject, importAudio, getSettings, saveSettings, getProjects, getRecentProjects };
};
