import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '../../contexts/PlayerContext';
import { useView } from '../../contexts/ViewContext';
import WarpedWaveform from './WarpedWaveform';

const Waveform = ({ src, sensitivity = 1.0 }) => {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const { isPlaying, currentTime, setCurrentTime, setClockSource, tempo } = usePlayer();
    const { pixelsPerBeat, totalDuration, setTotalDuration } = useView();

    // Derived pps
    const spb = 60 / tempo;
    const pixelsPerSecond = pixelsPerBeat / spb;

    const [audioDuration, setAudioDuration] = useState(0);

    // Initialize WaveSurfer ONCE
    useEffect(() => {
        if (!containerRef.current || wavesurferRef.current) return;

        try {
            wavesurferRef.current = WaveSurfer.create({
                container: containerRef.current,
                waveColor: '#e8c64d',
                progressColor: 'rgba(255,255,255,0.3)',
                cursorColor: 'transparent',
                cursorWidth: 0,
                barWidth: 0,
                barGap: 0,
                barRadius: 0,
                height: 128,
                normalize: true,
                minPxPerSec: Math.max(10, pixelsPerSecond || 100),
                fillParent: true,
                interact: false,
                autoScroll: false,
            });

            if (src) {
                wavesurferRef.current.load(src);
            }
        } catch (e) {
            console.error("WaveSurfer Init Error:", e);
        }

        return () => {
            if (wavesurferRef.current) {
                try {
                    wavesurferRef.current.destroy();
                } catch (e) { }
                wavesurferRef.current = null;
            }
        };
    }, []);

    // Handle src changes -> Enable Master Clock
    useEffect(() => {
        if (src) {
            setClockSource('external');
            if (wavesurferRef.current) {
                try {
                    wavesurferRef.current.load(src);
                } catch (e) { console.error("WaveSurfer Load Error:", e); }
            }
        } else {
            setClockSource('internal');
        }
    }, [src]);

    // Handle Duration & Sizing
    useEffect(() => {
        if (!wavesurferRef.current) return;

        const updateMetrics = () => {
            const dur = wavesurferRef.current.getDuration();
            if (dur > 0) {
                setAudioDuration(dur);
                if (dur > totalDuration) {
                    setTotalDuration(Math.ceil(dur));
                }
            }
        };

        const ws = wavesurferRef.current;
        ws.on('ready', updateMetrics);
        ws.on('decode', updateMetrics);

        if (ws.getDuration() > 0) updateMetrics();

        return () => {
            try {
                ws.un('ready', updateMetrics);
                ws.un('decode', updateMetrics);
            } catch (e) { }
        };
    }, [src, totalDuration]);

    // Sync Zoom
    useEffect(() => {
        if (wavesurferRef.current && pixelsPerSecond) {
            try {
                wavesurferRef.current.zoom(pixelsPerSecond);
            } catch (e) {
                console.error("WaveSurfer Zoom Error:", e);
            }
        }
    }, [pixelsPerSecond]);

    // Master Clock & Playback Logic
    // Effect 1: Handle Play/Pause and Clock Driving
    useEffect(() => {
        if (!wavesurferRef.current) return;
        const ws = wavesurferRef.current;
        let frameId;

        const syncLoop = () => {
            if (ws.isPlaying()) {
                setCurrentTime(ws.getCurrentTime());
                frameId = requestAnimationFrame(syncLoop);
            }
        };

        if (isPlaying) {
            ws.play().then(() => {
                syncLoop();
            }).catch(e => console.error("Play Error", e));
        } else {
            ws.pause();
            cancelAnimationFrame(frameId);
        }

        return () => cancelAnimationFrame(frameId);
    }, [isPlaying]);

    // Effect 2: Handle scrubbing (Seek when paused)
    useEffect(() => {
        if (!wavesurferRef.current || isPlaying) return; // Don't interfere if playing

        const ws = wavesurferRef.current;
        // Only seek if significantly different (avoid loops)
        if (Math.abs(ws.getCurrentTime() - currentTime) > 0.05) {
            ws.setTime(currentTime);
        }
    }, [currentTime]); // Trigger only when currentTime changes (e.g. Ruler Click)

    return (
        <div
            className="waveform-wrapper"
            style={{
                width: audioDuration > 0 ? `${audioDuration * pixelsPerSecond}px` : '100%',
                // Note: The width above is linear-time based. 
                // WarpedWaveform will render based on beats. 
                // If Warped is wider/narrower, we need to handle it.
                // Ideally we let WarpedWaveform dictate width?
                // But container needs to be sized.

                // For now, let's just make it large enough or overflow visible?
                // Actually WarpedWaveform should just position absolutely?

                height: '100%',
                position: 'relative',
                overflow: 'hidden'
            }}
        >
            {(!src) && (
                <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: '100%', height: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.2)', pointerEvents: 'none',
                    border: '2px dashed rgba(255,255,255,0.1)',
                    zIndex: 2
                }}>
                    No Audio Loaded
                </div>
            )}

            {/* WaveSurfer (Hidden - for Playback/Clock) */}
            <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: 0, visibility: 'hidden', position: 'absolute' }} />

            {/* Visual Warped Layer */}
            {src && (
                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                    {/* We pass height specifically? */}
                    <WarpedWaveform src={src} height={130} sensitivity={sensitivity} />
                </div>
            )}
        </div>
    );
};

export default Waveform;
