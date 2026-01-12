import React, { useMemo } from 'react';
import { useView } from '../../contexts/ViewContext';
import { usePlayer } from '../../contexts/PlayerContext';

const TimelineRuler = () => {
    const { pixelsPerBeat, totalDuration } = useView();
    const { tempo, startMarkerTime, setStartMarkerTime, setCurrentTime } = usePlayer();

    // Derived: Seconds per Beat
    const spb = 60 / tempo;
    // Derived: Pixels per Second (This is now variable based on tempo!)
    // pixelsPerBeat = pixelsPerSecond * spb
    // => pixelsPerSecond = pixelsPerBeat / spb
    const pixelsPerSecond = pixelsPerBeat / spb;

    const minTickSpacing = 50;

    // --- Time Scale (Minutes:Seconds) ---
    const timeInterval = useMemo(() => {
        const rawInterval = minTickSpacing / pixelsPerSecond;
        const snaps = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60];
        // find first snap larger than rawInterval
        const snap = snaps.find(s => s >= rawInterval) || 60;
        return snap;
    }, [pixelsPerSecond]);

    const timeTicks = [];
    // Ensure we cover the whole duration + a bit buffer
    for (let t = 0; t <= totalDuration; t += timeInterval) {
        timeTicks.push(t);
    }

    // --- Musical Scale ---
    // beats = time / spb
    // pixels = beats * pixelsPerBeat

    // We want ticks at fixed musical intervals (1 bar = 4 beats)
    const beatInterval = useMemo(() => {
        // Check pixel width of 1 beat
        if (pixelsPerBeat >= minTickSpacing) return 1;
        if (pixelsPerBeat * 4 >= minTickSpacing) return 4;
        return 16;
    }, [pixelsPerBeat]);

    const musicalTicks = [];
    const totalBeats = totalDuration / spb;
    for (let b = 0; b <= totalBeats; b += beatInterval) {
        musicalTicks.push(b);
    }

    const formatTime = (t) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        if (timeInterval < 1) {
            const ms = Math.floor((t % 1) * 10).toString();
            return `${m}:${s}.${ms}`;
        }
        return `${m}:${s}`;
    };

    const formatMusical = (beats) => {
        const bar = Math.floor(beats / 4) + 1;
        const beat = (beats % 4) + 1;
        if (beatInterval === 1) return `${bar}.${beat}`;
        return `${bar}`;
    };

    const handleRulerClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const clickedTime = offsetX / pixelsPerSecond;

        // Ensure within bounds
        const safeTime = Math.max(0, Math.min(totalDuration, clickedTime));

        setStartMarkerTime(safeTime);
        setCurrentTime(safeTime);
    };

    return (
        <div
            className="timeline-ruler"
            onClick={handleRulerClick}
            style={{
                height: '40px',
                minWidth: `${totalDuration * pixelsPerSecond}px`,
                backgroundColor: '#222',
                borderBottom: '1px solid #444',
                position: 'relative',
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                color: '#aaa',
                fontSize: '10px',
                userSelect: 'none',
                cursor: 'text'
            }}>
            {/* Start Marker Indicator */}
            <div style={{
                position: 'absolute',
                left: `${startMarkerTime * pixelsPerSecond}px`,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: 'rgba(255, 165, 0, 0.8)',
                zIndex: 5,
                transition: 'left 0.1s ease-out'
            }}>
                {/* Downward Triangle Icon */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '-6px',
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderTop: '8px solid orange',
                }}></div>
            </div>

            {/* Top Row: Musical Bars */}
            <div style={{ height: '20px', position: 'relative', borderBottom: '1px solid #333' }}>
                {musicalTicks.map(b => (
                    <div key={`mus-${b}`} style={{
                        position: 'absolute',
                        left: `${b * pixelsPerBeat}px`, // Use pixelsPerBeat directly
                        paddingLeft: '4px',
                        borderLeft: '1px solid #555',
                        height: '100%',
                        color: '#03dac6',
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>
                        {formatMusical(b)}
                    </div>
                ))}
            </div>

            {/* Bottom Row: Time */}
            <div style={{ height: '20px', position: 'relative' }}>
                {timeTicks.map(t => (
                    <div key={`time-${t}`} style={{
                        position: 'absolute',
                        left: `${t * pixelsPerSecond}px`,
                        paddingLeft: '4px',
                        borderLeft: '1px solid #444',
                        height: '50%',
                        bottom: 0,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none'
                    }}>
                        {formatTime(t)}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TimelineRuler;
