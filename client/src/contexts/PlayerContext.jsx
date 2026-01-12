import React, { createContext, useContext, useState, useEffect } from 'react';
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

    const togglePlay = () => setIsPlaying(prev => !prev);

    const stop = () => {
        setIsPlaying(false);
        setCurrentTime(startMarkerTime);
    };

    // Global Key Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                togglePlay();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Basic clock for UI updates (Internal Mode)
    useEffect(() => {
        let interval;
        if (isPlaying && clockSource === 'internal') {
            const start = performance.now();
            const offset = currentTime;
            interval = setInterval(() => {
                const now = performance.now();
                setCurrentTime(offset + (now - start) / 1000);
            }, 16);
        }
        return () => clearInterval(interval);
    }, [isPlaying, clockSource]);

    return (
        <PlayerContext.Provider value={{
            isPlaying,
            setIsPlaying,
            togglePlay,
            stop,
            currentTime,
            setCurrentTime,
            startMarkerTime,
            setStartMarkerTime,
            tempo,
            setTempo,
            clockSource,
            setClockSource
        }}>
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = () => useContext(PlayerContext);
