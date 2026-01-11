import React from 'react';
import { useView } from '../../contexts/ViewContext';

const TrackLane = ({ title, height = '100px', color = '#555', children }) => {
    const { totalDuration, pixelsPerSecond } = useView();
    const contentWidth = totalDuration * pixelsPerSecond;

    return (
        <div className="track-lane" style={{
            display: 'flex',
            height: height,
            backgroundColor: 'var(--bg-track)',
            borderBottom: '1px solid var(--border-light)',
            position: 'relative',
            minWidth: '100%' // Ensure it fills at least the screen
        }}>
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

                {/* Track Controls Mockup */}
                <div style={{ display: 'flex', gap: '2px' }}>
                    <button style={{ fontSize: '10px', padding: '2px 4px', background: '#444', border: 'none', color: '#fff' }}>S</button>
                    <button style={{ fontSize: '10px', padding: '2px 4px', background: '#444', border: 'none', color: '#fff' }}>M</button>
                </div>
            </div>

            {/* Track Content Area */}
            <div className="track-content" style={{
                flex: 1,
                position: 'relative',
                minWidth: `${contentWidth}px`, // Force expansion
                overflow: 'hidden' // Prevent internal scrollbars
            }}>
                {children}
            </div>
        </div>
    );
};

export default TrackLane;
