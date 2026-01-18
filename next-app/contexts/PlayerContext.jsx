'use client';
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useProject } from './ProjectContext';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
    const { tempoSettings } = useProject(); // Access tempo settings
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0); // in seconds
    const [startMarkerTime, setStartMarkerTime] = useState(0);
    const [tempo, setTempo] = useState(120);
    const [clockSource, setClockSource] = useState('internal');

    // Sync tempo from project settings (initial tempo for now)
    useEffect(() => {
        if (tempoSettings && tempoSettings.points.length > 0) {
            // Simply take the first point's value as the global tempo for now
            // Future: Support variable tempo map playback
            setTempo(tempoSettings.points[0].value);
        }
    }, [tempoSettings]);

    // Subscribers for High-Freq Updates (Animation Frame)
    const subscribers = useRef(new Set());
    const subscribe = useCallback((callback) => {
        subscribers.current.add(callback);
        return () => subscribers.current.delete(callback);
    }, []);

    const notifyTime = useCallback((time) => {
        // Broadcast to subscribers (Playhead, TimeDisplay, etc)
        subscribers.current.forEach(cb => cb(time));

        // We do NOT update React state every frame to avoid tree re-renders.
        // But we update a ref for access without subscription
        currentTimeRef.current = time;
    }, []);

    // Check if we need a Ref for current time to allow synchronous access
    const currentTimeRef = useRef(0);

    // Modified Setter: Updates State AND/OR Broadcasts
    // If commitState=true, triggers re-render.
    const updateCurrentTime = useCallback((time, commitState = false) => {
        currentTimeRef.current = time;
        notifyTime(time);
        if (commitState) {
            setCurrentTime(time);
        }
    }, [notifyTime]);

    const togglePlay = () => {
        setIsPlaying(prev => {
            if (prev) {
                // Stopping: Sync State to last known time
                setCurrentTime(currentTimeRef.current);
            }
            return !prev;
        });
    };

    const stop = () => {
        setIsPlaying(false);
        updateCurrentTime(startMarkerTime, true);
    };

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();

                if (e.shiftKey) {
                    // Shift+Space
                    updateCurrentTime(startMarkerTime, true);
                    if (!isPlaying) setIsPlaying(true);
                    else {
                        setIsPlaying(false);
                        updateCurrentTime(startMarkerTime, true);
                    }
                } else {
                    // Normal Space
                    togglePlay();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [startMarkerTime, isPlaying, updateCurrentTime]);

    // Basic clock for UI updates (Internal Mode)
    useEffect(() => {
        let frameId;
        if (isPlaying && clockSource === 'internal') {
            const start = performance.now();
            const offset = currentTimeRef.current;

            const loop = () => {
                const now = performance.now();
                const t = offset + (now - start) / 1000;
                notifyTime(t);
                frameId = requestAnimationFrame(loop);
            };
            frameId = requestAnimationFrame(loop);
        }
        return () => cancelAnimationFrame(frameId);
    }, [isPlaying, clockSource, notifyTime]);

    // ... (Metronome State unchanged) ...
    const [metronomeOn, setMetronomeOn] = useState(false);
    const [metronomeVolume, setMetronomeVolume] = useState(0.8);
    const [metronomeAccent, setMetronomeAccent] = useState(0.8);
    const [timeSignature, setTimeSignature] = useState({ numerator: 4, denominator: 4 });
    const metronomeRef = useRef(null);
    const [engineLoaded, setEngineLoaded] = useState(false); // Track async load

    // ... (AudioContext Init unchanged) ...
    useEffect(() => {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            import('../logic/MetronomeEngine').then(({ MetronomeEngine }) => {
                metronomeRef.current = new MetronomeEngine(ctx);
                setEngineLoaded(true); // Trigger sync
            });
        }
    }, []);

    // Effect: Sync Play/Stop (Metronome)
    useEffect(() => {
        const engine = metronomeRef.current;
        if (!engine) return;

        if (isPlaying && metronomeOn) {
            if (engine.ctx.state === 'suspended') engine.ctx.resume();

            // Start using Tempo Map and Current Time (Fixed Logic)
            engine.start(
                tempoSettings ? tempoSettings.points : [],
                timeSignature.numerator,
                timeSignature.denominator,
                currentTimeRef.current // Start from current time
            );
        } else {
            engine.stop();
        }
    }, [isPlaying, metronomeOn, tempoSettings, timeSignature, engineLoaded]);

    // Effect: Sync Settings (Dynamic updates while playing)
    useEffect(() => {
        const engine = metronomeRef.current;
        if (engine && tempoSettings) {
            engine.updateSettings({
                volume: metronomeVolume,
                accentLevel: metronomeAccent,
                tempoMap: tempoSettings.points, // Update Map dynamically (Fixed Logic)
                numerator: timeSignature.numerator,
                denominator: timeSignature.denominator
            });
        }
    }, [metronomeVolume, metronomeAccent, tempoSettings, timeSignature, engineLoaded]);

    return (
        <PlayerContext.Provider value={{
            isPlaying,
            setIsPlaying,
            togglePlay,
            stop,
            currentTime, // State (Low Freq)
            setCurrentTime: updateCurrentTime, // Wrapped Setter
            startMarkerTime,
            setStartMarkerTime,
            tempo,
            setTempo,
            clockSource,
            setClockSource,
            // Subscriptions
            subscribe,
            notifyTime,
            // Metronome Exports
            metronomeOn, setMetronomeOn,
            metronomeVolume, setMetronomeVolume,
            metronomeAccent, setMetronomeAccent,
            timeSignature, setTimeSignature
        }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => useContext(PlayerContext);
