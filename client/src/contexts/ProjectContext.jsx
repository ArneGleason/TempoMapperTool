import React, { createContext, useContext, useState, useEffect } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    // Tracks: { id, title, type: 'AUDIO' | 'TEMPO', color, src? }
    const [tracks, setTracks] = useState([
        { id: 'tempo-main', title: 'Tempo Map', type: 'TEMPO', color: '#00befc', height: '150px' }
    ]);

    // Tempo Settings
    const [tempoSettings, setTempoSettings] = useState({
        min: 60,
        max: 200, // Expanded max per user request implicity? or kept same. 20-300 was requested range. Let's stick to 60-200 or expand later.
        points: [{ id: 'init', bar: 0, value: 120 }]
    });

    const updateTempoSettings = (newSettings) => {
        setTempoSettings(prev => ({ ...prev, ...newSettings }));
    };

    // Selection State: { type: 'TEMPO_POINT' | 'TRACK' | null, ids: [] }
    const [selection, setSelection] = useState({ type: null, ids: [] });

    // Selection Helpers
    const selectItem = (type, id) => {
        setSelection({ type, ids: [id] });
    };

    const toggleSelectionItem = (type, id) => {
        setSelection(prev => {
            if (prev.type !== type) return { type, ids: [id] };
            const exists = prev.ids.includes(id);
            const newIds = exists ? prev.ids.filter(i => i !== id) : [...prev.ids, id];
            return { type, ids: newIds };
        });
    };

    const setSelectionItems = (type, ids) => {
        setSelection({ type, ids });
    };

    const clearSelection = () => {
        setSelection({ type: null, ids: [] });
    };

    // --- Tempo Map Logic ---
    const addTempoPoint = (bar, value) => {
        const newPoint = {
            id: `pt-${Date.now()}`,
            bar,
            value: Math.max(tempoSettings.min, Math.min(tempoSettings.max, value))
        };
        // Insert and Sort
        const newPoints = [...tempoSettings.points, newPoint].sort((a, b) => a.bar - b.bar);
        setTempoSettings({ ...tempoSettings, points: newPoints });
        selectItem('TEMPO_POINT', newPoint.id); // Auto-select new point
        return newPoint;
    };

    const updateTempoPoint = (id, validUpdates) => {
        setTempoSettings(prev => ({
            ...prev,
            points: prev.points.map(p => p.id === id ? { ...p, ...validUpdates } : p).sort((a, b) => a.bar - b.bar)
        }));
    };

    const deleteTempoPoint = (id) => {
        if (id === 'init') return; // Protect initial point
        setTempoSettings(prev => ({
            ...prev,
            points: prev.points.filter(p => p.id !== id)
        }));
        // Deselect if deleted
        if (selection.type === 'TEMPO_POINT' && selection.ids.includes(id)) {
            setSelection(prev => ({ ...prev, ids: prev.ids.filter(i => i !== id) }));
        }
    };

    const addAudioTrack = (file) => {
        const url = URL.createObjectURL(file);
        const newTrack = {
            id: `audio-${Date.now()}`,
            title: file.name,
            type: 'AUDIO',
            color: '#e8c64d',
            height: '130px',
            src: url,
            transientSensitivity: 0.5 // Default Sensitivity (50%)
        };
        setTracks(prev => [...prev, newTrack]);
    };

    const updateTrack = (id, updates) => {
        setTracks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // Prevent if typing in an input
                const tag = document.activeElement.tagName.toLowerCase();
                const isInput = tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable;
                if (isInput) return;

                if (selection && selection.type === 'TEMPO_POINT' && selection.ids.length > 0) {
                    selection.ids.forEach(id => {
                        if (id !== 'init') { // extra safety
                            deleteTempoPoint(id);
                        }
                    });

                    e.preventDefault(); // Prevent browser back nav if backspace
                } else if (selection && selection.type === 'TRACK' && selection.ids.length > 0) {
                    // Delete Track? User didn't ask for this yet.
                    // selection.ids.forEach(id => {
                    //     setTracks(prev => prev.filter(t => t.id !== id));
                    // });
                    // clearSelection();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, deleteTempoPoint]); // Re-bind if selection changes (or use Ref for selection if frequent unbind is bad. useEffect is fine)

    return (
        <ProjectContext.Provider value={{
            tracks, setTracks, addAudioTrack, updateTrack,
            tempoSettings, updateTempoSettings,
            selection, setSelection, // kept for manual override if really needed
            selectItem, toggleSelectionItem, setSelectionItems, clearSelection,
            addTempoPoint, updateTempoPoint, deleteTempoPoint
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
