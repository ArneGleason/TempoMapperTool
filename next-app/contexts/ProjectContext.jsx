'use client';
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    // Tracks: { id, title, type: 'AUDIO' | 'TEMPO', color, src?, offset? (seconds) }
    // Tracks: { id, title, type: 'AUDIO' | 'TEMPO', color, src?, offset? (seconds) }
    const [tracks, setTracks] = useState([
        { id: 'tempo-main', title: 'Tempo Map', type: 'TEMPO', color: '#00befc', height: '150px' }
    ]);

    // Project Name
    const [projectName, setProjectName] = useState('Untitled');

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

    // Range Selection State: { start: number, end: number } | null
    const [rangeSelection, setRangeSelection] = useState(null);

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
        pushUndoSnapshot();
        const newPoint = {
            id: `pt-${Date.now()}`,
            bar,
            value: Math.max(tempoSettings.min, Math.min(tempoSettings.max, value))
        };
        // Insert and Sort
        const newPoints = [...tempoSettings.points, newPoint].sort((a, b) => a.bar - b.bar);
        setTempoSettings({ ...tempoSettings, points: newPoints });
        selectItem('TEMPO_POINT', newPoint.id);
        return newPoint;
    };

    const updateTempoPoint = (id, validUpdates) => {
        setTempoSettings(prev => ({
            ...prev,
            points: prev.points.map(p => p.id === id ? { ...p, ...validUpdates } : p).sort((a, b) => a.bar - b.bar)
        }));
    };

    // --- History / Undo / Redo ---
    const [history, setHistory] = useState({ past: [], future: [] });

    // Snapshot current state to history
    const pushUndoSnapshot = () => {
        setHistory(curr => {
            const snapshot = {
                tracks: JSON.parse(JSON.stringify(tracks)), // Deep clone logic for safety (Audio Files are ref, src is string - OK)
                tempoSettings: JSON.parse(JSON.stringify(tempoSettings)),
                projectName
            };
            const newPast = [...curr.past, snapshot];
            if (newPast.length > 50) newPast.shift(); // Limit history

            return {
                past: newPast,
                future: []
            };
        });
    };

    const undo = () => {
        setHistory(curr => {
            if (curr.past.length === 0) return curr;

            const previous = curr.past[curr.past.length - 1];
            const newPast = curr.past.slice(0, -1);

            const currentSnapshot = {
                tracks: JSON.parse(JSON.stringify(tracks)),
                tempoSettings: JSON.parse(JSON.stringify(tempoSettings)),
                projectName
            };

            // Restore State
            setTracks(previous.tracks);
            setTempoSettings(previous.tempoSettings);
            if (previous.projectName) setProjectName(previous.projectName);

            return {
                past: newPast,
                future: [currentSnapshot, ...curr.future]
            };
        });
    };

    const redo = () => {
        setHistory(curr => {
            if (curr.future.length === 0) return curr;

            const next = curr.future[0];
            const newFuture = curr.future.slice(1);

            const currentSnapshot = {
                tracks: JSON.parse(JSON.stringify(tracks)),
                tempoSettings: JSON.parse(JSON.stringify(tempoSettings)),
                projectName
            };

            // Restore State
            setTracks(next.tracks);
            setTempoSettings(next.tempoSettings);
            if (next.projectName) setProjectName(next.projectName);

            return {
                past: [...curr.past, currentSnapshot],
                future: newFuture
            };
        });
    };

    const deleteTempoPoint = (id) => {
        if (id === 'init') return;

        pushUndoSnapshot(); // Save

        setTempoSettings(prev => ({
            ...prev,
            points: prev.points.filter(p => p.id !== id)
        }));
        if (selection.type === 'TEMPO_POINT' && selection.ids.includes(id)) {
            setSelection(prev => ({ ...prev, ids: prev.ids.filter(i => i !== id) }));
        }
    };

    // Update a track's properties (e.g. offset, syncPoint)
    const updateTrack = (trackId, updates) => {
        setTracks(prev => prev.map(t =>
            t.id === trackId ? { ...t, ...updates } : t
        ));
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
            file: file, // Store file for saving
            transientSensitivity: 0.5 // Default Sensitivity (50%)
        };

        // Auto-set project name if this is the first audio track
        // We check if we only have the tempo track so far
        const audioTracks = tracks.filter(t => t.type === 'AUDIO');
        if (audioTracks.length === 0) {
            // Remove extension including double extensions if needed, but simple for now
            const name = file.name.replace(/\.[^/.]+$/, "");
            setProjectName(name);
        }

        setTracks(prev => [...prev, newTrack]);
    };



    const shiftTrack = (id, offsetDelta) => {
        setTracks(prev => prev.map(t => {
            if (t.id === id) {
                const currentOffset = t.offset || 0;
                return { ...t, offset: currentOffset + offsetDelta };
            }
            return t;
        }));
    };

    const shiftAllAudioTracks = (offsetDelta) => {
        setTracks(prev => prev.map(t => {
            if (t.type === 'AUDIO') {
                const currentOffset = t.offset || 0;
                return { ...t, offset: currentOffset + offsetDelta };
            }
            return t;
        }));
    };

    const loadProjectState = (data) => {
        if (!data) return;
        if (data.tracks) setTracks(data.tracks);
        if (data.tempoSettings) setTempoSettings(data.tempoSettings);
        if (data.name) setProjectName(data.name);

        // Reset selection/playhead if needed
        setSelection({ type: null, ids: [] });
    };

    // --- Keyboard Shortcuts ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            const tag = document.activeElement.tagName.toLowerCase();
            const isInput = tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable;

            // Undo / Redo
            if ((e.ctrlKey || e.metaKey) && !isInput) {
                if (e.key === 'z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            }

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (isInput) return;

                if (selection && selection.type === 'TEMPO_POINT' && selection.ids.length > 0) {
                    selection.ids.forEach(id => {
                        if (id !== 'init') {
                            deleteTempoPoint(id); // Already has snapshot inside
                        }
                    });

                    e.preventDefault();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, deleteTempoPoint, undo, redo]);

    // Wrap other Mutators
    // Note: addAudioTrack is updated below via re-export, but definition is inside.
    // I need to update the definition block if I want to wrap it.

    // We can't wrap functions defined earlier unless we move them or edit them.
    // For `shiftAllAudioTracks` (defined after undo block?), I will replace it in next call or here if it fits.

    return (
        <ProjectContext.Provider value={{
            tracks, setTracks,
            addAudioTrack: (file) => { pushUndoSnapshot(); const url = URL.createObjectURL(file); const newTrack = { id: `audio-${Date.now()}`, title: file.name, type: 'AUDIO', color: '#e8c64d', height: '130px', src: url, file, transientSensitivity: 0.5 }; setTracks(prev => [...prev, newTrack]); if (tracks.filter(t => t.type === 'AUDIO').length === 0) setProjectName(file.name.replace(/\.[^/.]+$/, "")); },
            updateTrack, shiftTrack,
            shiftAllAudioTracks: (delta) => { pushUndoSnapshot(); shiftAllAudioTracks(delta); }, // Recursive? No, I need to call the original logic. 
            // Better to export `pushUndoSnapshot` and use it in components (TempoLane, TrackLane) AND rewrite internal functions to use it.
            pushUndoSnapshot,
            undo, redo,
            projectName, setProjectName,
            tempoSettings, updateTempoSettings,
            selection, setSelection,
            rangeSelection, setRangeSelection,
            selectItem, toggleSelectionItem, setSelectionItems, clearSelection,
            addTempoPoint, updateTempoPoint, deleteTempoPoint,
            loadProjectState
        }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
