import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { usePlayer } from '../../contexts/PlayerContext';
import { useView } from '../../contexts/ViewContext';
import { useProject } from '../../contexts/ProjectContext';
import WarpedWaveform from './WarpedWaveform';
import { TempoUtils } from '../../utils/TempoUtils';

const Waveform = ({ src, sensitivity = 1.0, offset = 0, syncPoint = null, trackId }) => {
    const containerRef = useRef(null);
    const wavesurferRef = useRef(null);
    const { isPlaying, currentTime, setCurrentTime, setClockSource, tempo } = usePlayer();
    const { pixelsPerBeat, totalDuration, setTotalDuration } = useView();
    const { tempoSettings, updateTrack } = useProject();

    // Map-Aware Layout Calculation
    // We need to position based on BEATS because Grid is PixelsPerBeat.
    let startBeat = 0;
    let endBeat = 0;
    if (tempoSettings && tempoSettings.points) {
        startBeat = TempoUtils.getBeatAtTime(offset, tempoSettings.points);
        // Width will be updated when duration is known
    }

    // Determine Pixels Per Second (Local Approximation for Interactions? Or disable linear interactions?)
    // For local interactions (click), we should map ClickX -> Beat -> Time.
    // For now, keep linear PPS as fallback for internal Wavesurfer?
    // Wavesurfer expects linear. We hide it anyway.
    const spb = 60 / (tempo || 120);
    const pixelsPerSecond = pixelsPerBeat / spb;

    const [audioDuration, setAudioDuration] = useState(0);

    // Calculate Width in Beats
    let widthPixels = '100%';
    if (audioDuration > 0 && tempoSettings.points) {
        const endGlobalTime = offset + audioDuration;
        const endGlobalBeat = TempoUtils.getBeatAtTime(endGlobalTime, tempoSettings.points);
        const durationBeats = endGlobalBeat - startBeat;
        widthPixels = `${durationBeats * pixelsPerBeat}px`;
    }

    // Offset in Pixels (Left Position)
    // ProjectTimeline (TrackLane) positions content inside. 
    // Wait, TrackLane renders `children` inside `wrapper`.
    // Does TrackLane handle the global Offset?
    // TrackLane: `minWidth: contentWidth`. `contentWidth` is global.
    // Check TrackLane (Step 803): 
    // `offset` logic is MISSING in TrackLane? 
    // TrackLane renders CHILDREN. Waveform handles offset inside "Null Space"?
    // Yes, Step 874: Waveform has "Null Space" and "Audio Content".
    // "Null Space" width = `offsetPixels`.
    // So "Audio Content" simply flows after Null Space.
    // We must ensure Null Space Width is correct (Beats * PPB).

    const offsetPixels = startBeat * pixelsPerBeat; // Correct Map-Aware Offset

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
                wavesurferRef.current.load(src).catch(e => {
                    if (e.name !== 'AbortError') console.error("WaveSurfer Init Load Error:", e);
                });
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
                wavesurferRef.current.load(src).catch(e => {
                    if (e.name !== 'AbortError') console.error("WaveSurfer Load Error:", e);
                });
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
                if (e.message !== 'No audio loaded') {
                    console.error("WaveSurfer Zoom Error:", e);
                }
            }
        }
    }, [pixelsPerSecond]);

    // Master Clock & Playback Logic
    // Effect 1: Handle Play/Pause and Clock Driving
    const { notifyTime } = usePlayer(); // Grab notifyTime

    useEffect(() => {
        if (!wavesurferRef.current) return;
        const ws = wavesurferRef.current;
        let frameId;

        const syncLoop = () => {
            if (ws.isPlaying()) {
                // Broadcast time to context subscribers (Playhead)
                // Do NOT set React State (setCurrentTime) to avoid re-renders
                notifyTime(ws.getCurrentTime());
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
    }, [isPlaying, notifyTime]);

    // Effect 2: Handle scrubbing (Seek when paused)
    // Effect 2: Handle scrubbing / seeking
    useEffect(() => {
        if (!wavesurferRef.current) return;

        const ws = wavesurferRef.current;
        // Check difference to avoid circular updates from SyncLoop
        const diff = Math.abs(ws.getCurrentTime() - currentTime);

        // If diff is significant, it's a Seek (or Shift+Space Rewind)
        if (diff > 0.1) {
            ws.setTime(currentTime);
        }
    }, [currentTime]);

    // Transient Detection Helper
    const scanForTransient = (startTime) => {
        if (!wavesurferRef.current) return startTime;
        const decodedData = wavesurferRef.current.getDecodedData();
        if (!decodedData) return startTime;

        const sampleRate = decodedData.sampleRate;
        const channelData = decodedData.getChannelData(0); // Use first channel
        const startIdx = Math.floor(startTime * sampleRate);
        const searchWindow = Math.floor(0.1 * sampleRate); // Look ahead 100ms (Reduced from 500ms for tighter snap)
        const endIdx = Math.min(startIdx + searchWindow, channelData.length);

        // Threshold based on sensitivity (1.0 = standard, 0.5 = less sensitive req higheramp)
        // Base threshold: 0.02 (silence floor)
        const threshold = 0.02 / (sensitivity || 1.0);

        for (let i = startIdx; i < endIdx; i++) {
            if (Math.abs(channelData[i]) > threshold) {
                // Found onset
                return i / sampleRate;
            }
        }
        return startTime; // No transient found, use click time
    };

    // Better: Attach handler to the Audio Content Div specifically.
    const handleAudioClick = (e) => {
        if (!src) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;

        let localTime = 0;

        if (tempoSettings && tempoSettings.points) {
            // Map-Aware Reverse Calculation
            // Pixels -> Beats -> Global Time -> Local Time
            const relativeBeat = offsetX / pixelsPerBeat;
            const globalBeat = startBeat + relativeBeat;
            const globalTime = TempoUtils.getTimeAtBeat(globalBeat, tempoSettings.points);
            localTime = globalTime - offset;
        } else {
            // Fallback Linear
            const spb = 60 / (tempo || 120);
            const pps = pixelsPerBeat / spb;
            localTime = offsetX / pps;
        }

        // Clamp localTime
        localTime = Math.max(0, localTime); // Can't be negative

        if (e.shiftKey) {
            // Smart Snap: Scan for transient starting from click time
            const snappedTime = scanForTransient(localTime);

            updateTrack(trackId, { syncPoint: snappedTime });
            e.stopPropagation();
        } else {
            const globalTime = offset + localTime;
            setCurrentTime(globalTime);
        }
    };

    // Null Space Click
    const handleNullClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        // Global time = clickX / pps (Since Null Space starts at 0 global time? No, Track starts at 0 visually in timeline usually?)
        // Wait. TrackLane renders relative to timeline? 
        // No, TrackLane is just a block.
        // If ProjectTimeline renders tracks, they usually start at left edge = Time 0.
        // So Null Space Left Edge = Time 0.
        // So click in Null Space = Global Time.
        // Yes.
        const globalTime = (e.clientX - rect.left) / pixelsPerSecond; // Simplification (rect.left might not be 0 if header exists)
        // Actually rect.left is screen coordinate.
        // We rely on visual position.
        // Let's rely on standard logic: Click anywhere in timeline should ideally set Playhead.
        // But for now, handle separately.

        // Using useView calc might be safer?
        // But let's stick to local math for simple Shift+Click.
    };

    return (
        <div className="waveform-outer" style={{ display: 'flex', height: '100%', position: 'relative' }}>

            {/* Null Space (Offset) */}
            {offset > 0 && (
                <div
                    onClick={handleNullClick}
                    style={{
                        width: `${offsetPixels}px`,
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)',
                        borderRight: '1px solid #444',
                        flexShrink: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#666',
                        fontSize: '10px',
                        overflow: 'hidden'
                    }}
                >
                    <span style={{ transform: 'rotate(-90deg)', whiteSpace: 'nowrap' }}>
                        {`+${(offset * 1000).toFixed(0)}ms`}
                    </span>
                </div>
            )}

            {/* Audio Content */}
            <div
                className="waveform-content"
                onClick={handleAudioClick}
                style={{
                    width: widthPixels,
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0
                }}
            >
                {/* Sync Marker Overlay */}
                {syncPoint !== null && (() => {
                    // Map-Aware Position
                    let syncLeft = 0;
                    if (tempoSettings && tempoSettings.points) {
                        const syncGlobalTime = offset + syncPoint;
                        const syncGlobalBeat = TempoUtils.getBeatAtTime(syncGlobalTime, tempoSettings.points);
                        syncLeft = (syncGlobalBeat - startBeat) * pixelsPerBeat;
                    } else {
                        syncLeft = syncPoint * pixelsPerSecondFallback;
                    }

                    return (
                        <div style={{
                            position: 'absolute',
                            left: `${syncLeft}px`,
                            top: 0,
                            bottom: 0,
                            width: '1px', // Line
                            backgroundColor: '#ff0', // Yellow
                            boxShadow: '0 0 4px #ff0',
                            zIndex: 10,
                            pointerEvents: 'none'
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: '-3px',
                                width: 0, height: 0,
                                borderLeft: '3px solid transparent',
                                borderRight: '3px solid transparent',
                                borderTop: '4px solid #ff0'
                            }} />
                        </div>
                    );
                })()}

                {(!src) && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0,
                        width: '100%', height: '100%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.2)', pointerEvents: 'none',
                        border: '2px dashed rgba(255,255,255,0.1)',
                        zIndex: 2
                    }}>No Audio</div>
                )}

                {/* WaveSurfer (Hidden) */}
                <div ref={containerRef} style={{ width: '100%', height: '100%', opacity: 0, visibility: 'hidden', position: 'absolute' }} />

                {/* Visual Warped Layer */}
                {src && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none' }}>
                        <WarpedWaveform src={src} height={130} sensitivity={sensitivity} startBeat={startBeat} offset={offset} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Waveform;
