import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { useView } from '../../contexts/ViewContext';
import { useProject } from '../../contexts/ProjectContext';
import { TempoUtils } from '../../utils/TempoUtils';

const Playhead = () => {
    const { subscribe, currentTime } = usePlayer(); // currentTime state used for initial position
    const { pixelsPerBeat } = useView();
    const { tempoSettings } = useProject();

    const lineRef = useRef(null);
    const requestIdRef = useRef(null);

    // updatePosition: Calculates and applies left style directly
    const updatePosition = (time) => {
        if (!lineRef.current) return;

        let beat = 0;
        // Global Map Lookup for Warped Position
        if (tempoSettings && tempoSettings.points) {
            beat = TempoUtils.getBeatAtTime(time, tempoSettings.points);
        } else {
            // Fallback
            beat = time * (120 / 60);
        }

        const left = beat * pixelsPerBeat;
        lineRef.current.style.transform = `translateX(${left}px)`;
    };

    // Subscription
    useEffect(() => {
        // Initial set based on prop time (in case paused)
        updatePosition(currentTime);

        const unsubscribe = subscribe((time) => {
            // High freq update
            // We use requestAnimationFrame aggregation or direct?
            // Direct is fine if 60fps callback.
            updatePosition(time);
        });

        return () => unsubscribe();
    }, [subscribe, pixelsPerBeat, tempoSettings]); // Re-subscribe if map changes (important!)

    // Also update when currentTime State changes (Seek, Stop)
    useEffect(() => {
        updatePosition(currentTime);
    }, [currentTime, pixelsPerBeat, tempoSettings]);

    return (
        <div className="playhead-container" style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0, // Container is 0-based
            width: '100%',
            pointerEvents: 'none',
            zIndex: 50
        }}>
            {/* Play Line */}
            <div ref={lineRef} style={{
                position: 'absolute',
                left: 0, // Moved by transform
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: '#fff',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)',
                willChange: 'transform',
                zIndex: 200
            }}>
                {/* Carrot / Head */}
                <div style={{
                    position: 'absolute',
                    top: '0px',
                    left: '-5px',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '10px solid #fff',
                }}></div>
            </div>
        </div>
    );
};

export default Playhead;
