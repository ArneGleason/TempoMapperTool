import React from 'react';

const TempoLane = () => {
    return (
        /* We reuse TrackLane in the parent, this is just the content */
        <div style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'var(--color-tempo-lane)',
            position: 'relative'
        }}>
            {/* Background Grid Lines (Mock) */}
            <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            {/* Tempo Vector Line (SVG Mockup) */}
            <svg width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
                {/* A line that goes up and down like the mockup */}
                <path d="M0,80 L100,78 L200,60 L300,85 L400,50 L500,70 L800,75 L2000,75"
                    fill="rgba(0, 190, 252, 0.2)"
                    stroke="var(--color-tempo-line)"
                    strokeWidth="2" />
                {/* Points */}
                <circle cx="0" cy="80" r="3" fill="var(--color-tempo-line)" />
                <circle cx="200" cy="60" r="3" fill="var(--color-tempo-line)" />
                <circle cx="400" cy="50" r="3" fill="var(--color-tempo-line)" />
            </svg>
        </div>
    );
};

export default TempoLane;
