import { useProject } from '../contexts/ProjectContext';

export const useProjectActions = () => {
    const { addAudioTrack } = useProject();

    // In a real app we'd probably consume a ProjectContext to get current state

    const saveProject = async (name, projectData) => {
        try {
            const res = await fetch('http://localhost:3001/api/projects/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data: projectData })
            });
            return await res.json();
        } catch (e) {
            console.error('Save failed', e);
        }
    };

    const loadProject = async (path) => {
        try {
            const res = await fetch('http://localhost:3001/api/projects/load', {
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

    return { saveProject, loadProject, importAudio };
};
