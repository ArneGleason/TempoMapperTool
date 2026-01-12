import React from 'react';
import { useView } from '../../contexts/ViewContext';

import { usePlayer } from '../../contexts/PlayerContext';
import { useProject } from '../../contexts/ProjectContext';
import GridOverlay from './GridOverlay';

const TrackLane = ({ id, title, height = '100px', color = '#555', headerExtra, hideControls = false, children }) => {
    const { pixelsPerBeat, totalDuration } = useView();
    const { tempo } = usePlayer();
    const { selectItem, selection } = useProject();

    const isSelected = selection && selection.type === 'TRACK' && selection.ids.includes(id);

    // Derived pps
    const spb = 60 / tempo;
    const pixelsPerSecond = pixelsPerBeat / spb;

    const contentWidth = totalDuration * pixelsPerSecond;

    return (
        <div
            className="track-lane"
            onClick={(e) => {
                // Don't select if clicking inside controls or inputs
                if (e.target.tagName === 'BUTTON' || e.target.tagName === 'INPUT') return;
                selectItem('TRACK', id);
            }}
            style={{
                display: 'flex',
                height: height,
                backgroundColor: isSelected ? 'rgba(255,255,255,0.05)' : 'var(--bg-track)',
                borderBottom: '1px solid var(--border-light)',
                position: 'relative',
                minWidth: '100%', // Ensure it fills at least the screen
                outline: isSelected ? '1px solid var(--primary-accent)' : 'none'
            }}
        >
            {/* Track Header - Sticky? For now just static left */}
            <div className="track-header" style={{
                width: 'var(--track-header-width)',
                minWidth: 'var(--track-header-width)',
                backgroundColor: 'var(--bg-panel)',
                borderRight: '1px solid var(--border-light)',
                padding: '5px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'sticky', // Make header sticky
                left: 0,
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }}></div>
                    <span style={{ fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {title}
                    </span>
                </div>

                {/* headerExtra for custom controls like Min/Max inputs */}
                {headerExtra && (
                    <div style={{ marginBottom: '5px' }}>
                        {headerExtra}
                    </div>
                )}

                {/* Track Controls Mockup */}
                {!hideControls && (
                    <div style={{ display: 'flex', gap: '2px' }}>
                        <button style={{ fontSize: '10px', padding: '2px 4px', background: '#444', border: 'none', color: '#fff' }}>S</button>
                        <button style={{ fontSize: '10px', padding: '2px 4px', background: '#444', border: 'none', color: '#fff' }}>M</button>
                    </div>
                )}
            </div>

            {/* Track Content Area */}
            <div className="track-content" style={{
                flex: 1,
                position: 'relative',
                minWidth: `${contentWidth}px`, // Force expansion
                overflow: 'hidden' // Prevent internal scrollbars
            }}>
                {children}
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}>
                    <GridOverlay />
                </div>
            </div>
        </div>
    );
};

export default TrackLane;
