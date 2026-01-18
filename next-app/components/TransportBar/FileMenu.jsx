'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useProjectActions } from '../../logic/ProjectActions';
import { useProject } from '../../contexts/ProjectContext';
import { useDialog } from '../../contexts/DialogContext'; // Hook

const FileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [recents, setRecents] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]); // List of folders in root
    const menuRef = useRef(null);

    const { saveProject, loadProject, importAudio, getSettings, saveSettings, getProjects } = useProjectActions();
    const { projectName, setProjectName, tracks, tempoSettings, loadProjectState } = useProject(); // Get current state for saving

    // Close on click outside
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Fetch recents and projects when menu opens
    useEffect(() => {
        if (isOpen) {
            fetch('/api/projects/recent')
                .then(res => res.json())
                .then(data => setRecents(data))
                .catch(console.error);

            getProjects()
                .then(data => setAvailableProjects(data))
                .catch(console.error);
        }
    }, [isOpen]);

    const dialog = useDialog();

    const handleAction = async (action) => {
        setIsOpen(false);

        if (action === 'NEW') {
            const shouldCreate = await dialog.confirm('Create new project? Unsaved changes will be lost.', 'New Project');
            if (shouldCreate) window.location.reload();
        }
        else if (action === 'OPEN') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await file.text();
                        const data = JSON.parse(text);
                        // If lacking name, use filename
                        if (!data.name) {
                            data.name = file.name.replace('.tmt.json', '').replace('.json', '');
                        }
                        loadProjectState(data);
                    } catch (err) {
                        console.error(err);
                        dialog.alert('Failed to parse project file', 'Error');
                    }
                }
            };
            input.click();
        }
        else if (action === 'SAVE') {
            let nameToSave = projectName;
            if (nameToSave === 'Untitled') {
                const inputName = await dialog.prompt('Project Name:', 'MySong', 'Save Project');
                if (!inputName) return;
                nameToSave = inputName;
                setProjectName(nameToSave);
            }

            await saveProject(nameToSave, {
                name: nameToSave,
                tracks,
                tempoSettings
            });
            await dialog.alert(`Project "${nameToSave}" Saved!`, 'Success');
        }
        else if (action === 'SETTINGS') {
            const current = await getSettings();
            // If server is offline or returns empty, assume default structure for display, but warn user.
            const defaultDisplay = 'C:/Users/User/Documents/TempoMapMaker/Projects'; // Generic placeholder if we can't get real one
            const currentPath = current.rootFolder || `Not Set (Server Offline?)`;

            const newRoot = await dialog.prompt(
                `Current Root: ${currentPath}\n\nEnter new absolute path for projects:`,
                current.rootFolder || defaultDisplay,
                'Project Settings'
            );

            if (newRoot) {
                // Sanitize input: Remove surrounding quotes (common in Windows "Copy as path") and normalize slashes
                const sanitizedRoot = newRoot.trim().replace(/^"|"$/g, '').replace(/\\/g, '/');

                if (sanitizedRoot !== current.rootFolder) {
                    await saveSettings({ rootFolder: sanitizedRoot });
                    await dialog.alert(`Settings Updated.\n\nNew Project Root:\n${sanitizedRoot}`, 'Settings Saved');
                }
            }
        }
        else if (action === 'IMPORT_AUDIO') {
            importAudio();
        }
        else if (action.startsWith('OPEN_RECENT:')) {
            const path = action.split('OPEN_RECENT:')[1];
            try {
                const data = await loadProject(path);
                if (data) {
                    if (!data.name) {
                        const filename = path.split(/[\\/]/).pop();
                        data.name = filename.replace('.tmt.json', '').replace('.json', '');
                    }
                    loadProjectState(data);
                }
            } catch (e) {
                console.error("Load failed", e);
                await dialog.alert("Failed to load project from " + path, "Error");
            }
        }
    };

    return (
        <div className="file-menu-container" ref={menuRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: isOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: 'none',
                    color: '#ccc',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                }}
            >
                File
            </button>

            {isOpen && (
                <div className="dropdown" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: '#2d2d2d',
                    border: '1px solid #3e3e3e',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    minWidth: '200px',
                    zIndex: 1000,
                    borderRadius: '4px',
                    padding: '4px 0'
                }}>
                    <MenuItem onClick={() => handleAction('NEW')}>New Project</MenuItem>
                    <MenuItem onClick={() => handleAction('OPEN')}>Open Project...</MenuItem>
                    <div style={{ height: '1px', background: '#3e3e3e', margin: '4px 0' }}></div>

                    <MenuItem onClick={() => handleAction('SAVE')}>Save Project</MenuItem>
                    <MenuItem onClick={() => handleAction('SAVE_AS')}>Save As...</MenuItem>
                    <MenuItem onClick={() => handleAction('SETTINGS')}>Settings...</MenuItem>

                    <div style={{ height: '1px', background: '#3e3e3e', margin: '4px 0' }}></div>

                    <div style={{ padding: '4px 12px', fontSize: '10px', color: '#666', fontWeight: 'bold' }}>RECENT PROJECTS</div>
                    {recents.length === 0 && <div style={{ padding: '4px 12px', fontSize: '12px', color: '#555' }}>No recent projects</div>}
                    {recents.map((p, i) => (
                        <MenuItem key={i} onClick={() => handleAction(`OPEN_RECENT:${p.path}`)}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{p.name}</span>
                                <span style={{ fontSize: '10px', color: '#666' }}>{p.path}</span>
                            </div>
                        </MenuItem>
                    ))}

                    <div style={{ height: '1px', background: '#3e3e3e', margin: '4px 0' }}></div>
                    <MenuItem onClick={() => handleAction('IMPORT_AUDIO')}>Import Audio...</MenuItem>
                    <MenuItem onClick={() => handleAction('EXPORT_MIDI')}>Export MIDI Tempo Map...</MenuItem>
                </div>
            )}
        </div>
    );
};

const MenuItem = ({ children, onClick }) => (
    <div
        onClick={onClick}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00befc22'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        style={{
            padding: '6px 12px',
            fontSize: '13px',
            color: '#eee',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
        }}
    >
        {children}
    </div>
);

export default FileMenu;
