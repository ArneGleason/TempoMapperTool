import React, { useEffect, useRef, useState } from 'react';
import { useView } from '../../contexts/ViewContext';
import { useProject } from '../../contexts/ProjectContext';
import { usePlayer } from '../../contexts/PlayerContext';
import WaveSurfer from 'wavesurfer.js';

const NavigationTimeline = () => {
    const {
        pixelsPerBeat,
        setPixelsPerBeat,
        totalDuration,
        scrollContainerRef,
        setScroll
    } = useView();

    const { tracks } = useProject();
    const { currentTime, tempo } = usePlayer();

    // Derived pps
    const spb = 60 / tempo;
    const pixelsPerSecond = pixelsPerBeat / spb;

    // Helper to set PPS by converting to PPB
    const setPixelsPerSecond = (newPPS) => {
        setPixelsPerBeat(newPPS * spb);
    };

    const [viewport, setViewport] = useState({ left: 0, width: 100 });

    // Refs
    const navRef = useRef(null);
    const waveContainerRef = useRef(null);
    const waveInstance = useRef(null);

    // Interaction State
    const interaction = useRef({
        type: null,
        startX: 0,
        startLeft: 0,
        startWidth: 0,
        navWidth: 0
    });

    const audioTrack = tracks.find(t => t.type === 'AUDIO');

    // 1. Init Mini-Waveform
    useEffect(() => {
        if (!waveContainerRef.current || !audioTrack?.src) return;

        if (!waveInstance.current) {
            waveInstance.current = WaveSurfer.create({
                container: waveContainerRef.current,
                waveColor: 'rgba(232, 198, 77, 0.4)', // Faint Yellow (Future)
                progressColor: '#555', // Dark Grey (Past)
                cursorWidth: 1,
                cursorColor: '#fff',
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                height: 40,
                normalize: true,
                fillParent: true,
                interact: false,
            });
        }

        waveInstance.current.load(audioTrack.src);

        return () => {
            // Keep instance allows for smoother re-renders
        };
    }, [audioTrack?.src]);

    // 2. Playhead Sync (Update mini-wave progress)
    useEffect(() => {
        if (waveInstance.current && waveInstance.current.getDuration() > 0) {
            const currentWaveTime = waveInstance.current.getCurrentTime();
            if (Math.abs(currentWaveTime - currentTime) > 0.5) {
                waveInstance.current.setTime(currentTime);
            }
        }
    }, [currentTime]);

    // 3. Viewport Sync (Global Scroll -> Nav Box)
    const updateViewport = () => {
        if (!scrollContainerRef.current || !navRef.current || interaction.current.type) return;

        const container = scrollContainerRef.current;
        const navWidth = navRef.current.clientWidth;

        // VISIBLE AREA CALCULATION:
        // The container has a Sticky Header of 200px on the left (effectively obscuring content underneath at X=0..200 relative to Viewport).
        // BUT the content starts at X=200px relative to the Scrolling Canvas.
        // So: 
        // ScrollLeft = 0. Visible Time starts at 0.
        // ScrollLeft = 100. Visible Time starts at 100px worth of time.
        // The "Visible Width" of the TIME content is the ContainerWidth - 200px (Sidebar).

        // IMPORTANT: We must handle if container is smaller than 200px (collapse).
        const visibleWidthPx = Math.max(10, container.clientWidth - 200);
        const scrollLeftPx = container.scrollLeft;

        // Ratio: NavWidth / TotalProjectDuration
        // Note: Nav represents 0s to TotalDuration.
        const navRatio = navWidth / Math.max(totalDuration, 1);

        const startSeconds = scrollLeftPx / pixelsPerSecond;
        const visibleSeconds = visibleWidthPx / pixelsPerSecond;

        const leftPx = startSeconds * navRatio;
        const widthPx = visibleSeconds * navRatio;

        setViewport({
            left: Math.max(0, leftPx),
            width: Math.min(navWidth, Math.max(widthPx, 5)) // Min 5px 
        });
    };

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', updateViewport);
            window.addEventListener('resize', updateViewport);
            updateViewport();
        }
        return () => {
            if (container) {
                container.removeEventListener('scroll', updateViewport);
            }
            window.removeEventListener('resize', updateViewport);
        };
    }, [scrollContainerRef.current, pixelsPerSecond, totalDuration]);

    // 4. Interaction (Nav Box -> Global Scroll & Zoom)
    const startInteraction = (e, type) => {
        e.stopPropagation();
        e.preventDefault();

        interaction.current = {
            type,
            startX: e.clientX,
            startLeft: viewport.left,
            startWidth: viewport.width,
            navWidth: navRef.current.clientWidth
        };

        document.body.style.cursor = type === 'DRAG' ? 'grabbing' : 'ew-resize';
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        if (!interaction.current.type || !scrollContainerRef.current) return;

        const { type, startX, startLeft, startWidth, navWidth } = interaction.current;
        const delta = e.clientX - startX;

        let newLeft = startLeft;
        let newWidth = startWidth;

        if (type === 'DRAG') {
            // Shift left/right, keep width
            newLeft = Math.max(0, Math.min(navWidth - startWidth, startLeft + delta));
        } else if (type === 'RESIZE_L') {
            const maxLeft = startLeft + startWidth - 10;
            newLeft = Math.max(0, Math.min(maxLeft, startLeft + delta));
            newWidth = startWidth - (newLeft - startLeft);
        } else if (type === 'RESIZE_R') {
            const maxWidth = navWidth - startLeft;
            newWidth = Math.max(10, Math.min(maxWidth, startWidth + delta));
        }

        // Optimistic UI update
        setViewport({ left: newLeft, width: newWidth });

        // Logic applied to Global View
        const navRatio = navWidth / Math.max(totalDuration, 1);

        const newVisibleSeconds = newWidth / navRatio;
        const newStartSeconds = newLeft / navRatio;

        // Calculate new PPS based on Main View's visible area (Container - Header)
        const containerViewWidth = Math.max(100, scrollContainerRef.current.clientWidth - 200);

        let newPPS = containerViewWidth / newVisibleSeconds;
        newPPS = Math.max(1, Math.min(5000, newPPS)); // Clamp zoom

        const newScrollLeft = newStartSeconds * newPPS;

        setPixelsPerSecond(newPPS);
        setScroll(newScrollLeft);
    };

    const handleMouseUp = () => {
        interaction.current.type = null;
        document.body.style.cursor = 'default';
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const handleWheel = (e) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? pixelsPerSecond * zoomFactor : pixelsPerSecond / zoomFactor;
        setPixelsPerSecond(Math.max(1, Math.min(5000, newZoom)));
    };

    return (
        <div
            className="nav-timeline"
            ref={navRef}
            onWheel={handleWheel}
            style={{ height: '40px', width: '100%', backgroundColor: '#1a1a1a', borderTop: '1px solid #333', position: 'relative', overflow: 'hidden', userSelect: 'none' }}
        >
            {/* Background Waveform */}
            <div ref={waveContainerRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 1 }}></div>

            {/* Viewport Box */}
            <div
                onMouseDown={(e) => startInteraction(e, 'DRAG')}
                style={{
                    position: 'absolute',
                    top: 1, bottom: 1,
                    left: viewport.left,
                    width: viewport.width,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid #aaa',
                    borderRadius: '2px',
                    cursor: 'grab',
                    boxSizing: 'border-box',
                    zIndex: 10,
                    boxShadow: '0 0 4px rgba(0,0,0,0.5)'
                }}
            >
                {/* L Handle */}
                <div onMouseDown={(e) => startInteraction(e, 'RESIZE_L')} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 11 }}>
                    <div style={{ position: 'absolute', left: 3, top: '50%', height: '16px', width: '3px', background: '#fff', transform: 'translateY(-50%)', borderRadius: '1px' }}></div>
                </div>
                {/* R Handle */}
                <div onMouseDown={(e) => startInteraction(e, 'RESIZE_R')} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 11 }}>
                    <div style={{ position: 'absolute', right: 3, top: '50%', height: '16px', width: '3px', background: '#fff', transform: 'translateY(-50%)', borderRadius: '1px' }}></div>
                </div>
            </div>
        </div>
    );
};

export default NavigationTimeline;
