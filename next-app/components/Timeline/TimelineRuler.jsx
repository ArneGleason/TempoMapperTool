import React, { useMemo } from 'react';
import { useView } from '../../contexts/ViewContext';
import { usePlayer } from '../../contexts/PlayerContext';

import { useProject } from '../../contexts/ProjectContext'; // Add Import

const TimelineRuler = () => {
    const { pixelsPerBeat, totalDuration } = useView();
    const { tempo, startMarkerTime, setStartMarkerTime, setCurrentTime, timeSignature } = usePlayer();
    const { rangeSelection, setRangeSelection } = useProject();

    // Derived values...
    const spb = 60 / tempo;
    const pixelsPerSecond = pixelsPerBeat / spb;

    const minTickSpacing = 50;

    // Ruler Grid Logic
    // Bars depend on Time Signature: Numerator * (4/Denominator) Quarter Notes per Bar.
    // pixelsPerBeat is Pixels Per Quarter Note.
    const beatsPerBarQN = timeSignature.numerator * (4 / timeSignature.denominator);
    const barIntervalPx = beatsPerBarQN * pixelsPerBeat;

    const timeInterval = useMemo(() => {
        const rawInterval = minTickSpacing / pixelsPerSecond;
        const snaps = [0.1, 0.5, 1, 2, 5, 10, 15, 30, 60];
        const snap = snaps.find(s => s >= rawInterval) || 60;
        return snap;
    }, [pixelsPerSecond]);

    const timeTicks = [];
    for (let t = 0; t <= totalDuration; t += timeInterval) {
        timeTicks.push(t);
    }

    // Calculate Bar Positions
    const musicalTicks = [];
    // Total Bars
    const totalBars = totalDuration / (beatsPerBarQN * spb);

    // We only draw Bar Lines for now to avoid clutter
    for (let b = 0; b <= totalBars; b++) {
        musicalTicks.push(b);
    }

    const formatMusical = (barIndex) => {
        return `${barIndex + 1}`;
    };

    // --- Interaction ---
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState(null);

    const getSafeTime = (e, rect) => {
        const offsetX = e.clientX - rect.left;
        const time = offsetX / pixelsPerSecond;
        return Math.max(0, Math.min(totalDuration, time));
    };

    const handleMouseDown = (e) => {
        if (e.shiftKey) {
            setIsDragging(true);
            const rect = e.currentTarget.getBoundingClientRect();
            const time = getSafeTime(e, rect);
            setDragStart(time);
            setRangeSelection({ start: time, end: time });
        } else {
            // Normal Click (Playhead)
            const rect = e.currentTarget.getBoundingClientRect();
            const time = getSafeTime(e, rect);
            setStartMarkerTime(time);
            setCurrentTime(time);
        }
    };

    const handleMouseMove = (e) => {
        if (isDragging) {
            const rect = e.currentTarget.getBoundingClientRect();
            const time = getSafeTime(e, rect);
            setRangeSelection({
                start: Math.min(dragStart, time),
                end: Math.max(dragStart, time)
            });
        }
    };

    const handleMouseUp = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragStart(null);
        }
    };

    const handleMouseLeave = () => {
        if (isDragging) {
            setIsDragging(false);
            setDragStart(null);
        }
    };


    return (
        <div
            className="timeline-ruler"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{
                height: '20px',
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

            {/* Range Selection Overlay */}
            {rangeSelection && (
                <div style={{
                    position: 'absolute',
                    left: `${rangeSelection.start * pixelsPerSecond}px`,
                    width: `${(rangeSelection.end - rangeSelection.start) * pixelsPerSecond}px`,
                    top: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    zIndex: 4,
                    pointerEvents: 'none',
                    borderLeft: '1px solid rgba(255,255,255,0.4)',
                    borderRight: '1px solid rgba(255,255,255,0.4)'
                }}></div>
            )}

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
            <div style={{ height: '20px', position: 'relative' }}>
                {musicalTicks.map(b => (
                    <div key={`mus-${b}`} style={{
                        position: 'absolute',
                        left: `${b * barIntervalPx}px`,
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
        </div>
    );
};

export default TimelineRuler;
