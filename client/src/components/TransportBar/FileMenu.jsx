import React, { useState, useEffect, useRef } from 'react';
import { useProjectActions } from '../../logic/ProjectActions';

const FileMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [recents, setRecents] = useState([]);
    const menuRef = useRef(null);

    const { saveProject, loadProject, importAudio } = useProjectActions();

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

    // Fetch recents when menu opens
    useEffect(() => {
        if (isOpen) {
            fetch('http://localhost:3001/api/projects/recent')
                .then(res => res.json())
                .then(data => setRecents(data))
                .catch(console.error);
        }
    }, [isOpen]);

    const handleAction = async (action) => {
        setIsOpen(false);

        if (action === 'NEW') {
            const confirm = window.confirm('Create new project? Unsaved changes will be lost.');
            if (confirm) window.location.reload();
        }
        else if (action === 'SAVE') {
            // Mock data for now
            const name = prompt('Project Name:', 'MySong');
            if (name) {
                await saveProject(name, { tracks: [], tempoMap: [] });
                alert('Project Saved!');
            }
        }
        else if (action === 'IMPORT_AUDIO') {
            importAudio();
        }
        else if (action.startsWith('OPEN_RECENT:')) {
            const path = action.split('OPEN_RECENT:')[1];
            const data = await loadProject(path);
            console.log('Loaded Project:', data);
            // We would hydrate state here
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
