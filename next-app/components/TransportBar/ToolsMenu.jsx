import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { usePlayer } from '../../contexts/PlayerContext';

const ToolsMenu = () => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const { rangeSelection, tracks, shiftTrack } = useProject();
    const { tempo } = usePlayer();

    // Toggle Menu
    const toggleMenu = () => setIsOpen(!isOpen);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Action: Align Track to Bar 5
    const handleAlignToBar5 = () => {
        if (!rangeSelection) {
            alert("Please select a range on the ruler (Shift+Drag) first.");
            setIsOpen(false);
            return;
        }

        // Logic:
        // 1. Get Start Time of Selection
        const selectionStart = rangeSelection.start;

        // 2. Calculate Target Time (Bar 5 Start)
        // Bar 1 starts at 0. Bar 5 starts at 4 * 4 beats = 16 beats.
        // Time = Beats * (60 / Tempo)
        // NOTE: This assumes constant tempo for now (which is true for our baseline)
        const spb = 60 / tempo;
        const targetBeats = (5 - 1) * 4; // 16 beats
        const targetTime = targetBeats * spb;

        // 3. Calculate Offset
        // We want selectionStart to move to targetTime.
        // difference = targetTime - selectionStart
        const offsetDelta = targetTime - selectionStart;

        // 4. Shift ALL Audio Tracks (or selected ones? Let's just shift 'AUDIO' tracks for now as user implied 'Shift Tracks')
        tracks.forEach(t => {
            if (t.type === 'AUDIO') {
                shiftTrack(t.id, offsetDelta);
            }
        });

        setIsOpen(false);
    };

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button
                onClick={toggleMenu}
                style={{
                    background: isOpen ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '4px',
                    color: '#cccccc',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                }}
            >
                Tools
                <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: '#333',
                    border: '1px solid #555',
                    borderRadius: '4px',
                    padding: '4px 0',
                    minWidth: '200px',
                    zIndex: 1000,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                }}>
                    <div
                        onClick={handleAlignToBar5}
                        style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            color: '#eee',
                            fontSize: '12px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            opacity: rangeSelection ? 1 : 0.5
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#444'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <span>Align Selection to Bar 5</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolsMenu;
