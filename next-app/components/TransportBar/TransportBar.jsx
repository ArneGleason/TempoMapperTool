'use client';
import React from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { useProject } from '../../contexts/ProjectContext';
import FileMenu from './FileMenu';
import ToolsMenu from './ToolsMenu';
import { useProjectActions } from '../../logic/ProjectActions';
import { TempoUtils } from '../../utils/TempoUtils';

const Button = ({ onClick, children, active, color = "#cccccc" }) => (
    <button
        onClick={onClick}
        style={{
            background: active ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: active ? '#fff' : color,
            cursor: 'pointer',
            padding: '4px 8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.1s ease',
            minWidth: '32px'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
        onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
    >
        {children}
    </button>
);

const Icons = {
    Play: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
    Pause: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>,
    Stop: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z" /></svg>,
    Record: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="#ff4d4f"><circle cx="12" cy="12" r="10" /></svg>,
    Metronome: ({ active }) => <svg width="16" height="16" viewBox="0 0 24 24" fill={active ? "#03dac6" : "currentColor"}><path d="M12 2l-9.5 17h19L12 2zm0 3.2L18.8 17H5.2L12 5.2z" /><path d="M11 15h2v2h-2z" /></svg>
};

const TransportBar = () => {
    const {
        isPlaying, togglePlay, stop, currentTime, tempo: initialTempo,
        // Grab subscription
        subscribe,
        metronomeOn, setMetronomeOn,
        timeSignature, setTimeSignature
    } = usePlayer();
    const { projectName, tempoSettings } = useProject();

    // Refs for High-Freq DOM Updates
    const tempoRef = React.useRef(null);
    const positionRef = React.useRef(null);
    const timeRef = React.useRef(null);

    // Helper to format position
    const updateDisplay = (time) => {
        // 1. Tempo
        let currentTempo = initialTempo;
        if (tempoSettings && tempoSettings.points) {
            // Dynamic Tempo Lookup
            // We need to import TempoUtils. Can we assume it is on window or import it?
            // We must import it at top of file. (I will add import).
            // Assuming import is added.
            currentTempo = TempoUtils.getTempoAtTime(time, tempoSettings.points);
        }

        if (tempoRef.current) {
            tempoRef.current.textContent = `${currentTempo.toFixed(2)} BPM`;
        }

        // 2. Bar/Beat/Tick
        // We need 'total beats' (quarters).
        // Since Map handles time->beat, we use it.
        let totalBeats = 0;
        if (tempoSettings && tempoSettings.points) {
            totalBeats = TempoUtils.getBeatAtTime(time, tempoSettings.points);
        } else {
            totalBeats = time * (initialTempo / 60);
        }

        // Adjust for Time Sig
        // TotalBeats is Quarter Notes (standard).
        // If Denom=8, 1 Beat = 0.5 QN.
        // Measure = Numerator Beats.
        // We need to convert QN -> TimeSigBeats.
        // BeatMultiplier = Denom / 4.
        const totalSigBeats = totalBeats * (timeSignature.denominator / 4);

        const bar = Math.floor(totalSigBeats / timeSignature.numerator) + 1;
        const beat = Math.floor(totalSigBeats % timeSignature.numerator) + 1;
        const tick = Math.floor((totalSigBeats % 1) * 96).toString().padStart(2, '0');

        if (positionRef.current) {
            positionRef.current.textContent = `${bar} / ${timeSignature.numerator} / ${beat}.${tick}`;
        }

        // 3. Time M:S:ms
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60).toString().padStart(2, '0');
        const ms = Math.floor((time % 1) * 100).toString().padStart(2, '0');

        if (timeRef.current) {
            timeRef.current.textContent = `${minutes}:${seconds}.${ms}`;
        }
    };

    // Subscription
    React.useEffect(() => {
        // Initial Update
        updateDisplay(currentTime);

        const unsubscribe = subscribe((t) => {
            updateDisplay(t);
        });
        return () => unsubscribe();
    }, [subscribe, currentTime, tempoSettings, timeSignature, initialTempo]);

    // ... Metronome Settings Logic (Same) ...
    const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

    // Time Signature Styles (Same)
    const inputStyle = {
        width: '24px',
        background: 'transparent',
        border: 'none',
        color: 'inherit',
        textAlign: 'center',
        fontFamily: 'inherit',
        fontSize: 'inherit',
        padding: 0,
        appearance: 'textfield',
        MozAppearance: 'textfield'
    };

    return (
        <div className="transport-bar" style={{
            height: 'var(--header-height)',
            backgroundColor: 'var(--bg-header)',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            justifyContent: 'space-between',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            zIndex: 1200,
            position: 'relative'
        }}>
            <div className="left-controls" style={{ display: 'flex', gap: '4px' }}>
                <FileMenu />
                <ToolsMenu />
                <div style={{ width: '1px', height: '20px', background: 'var(--border-light)', margin: '0 8px' }}></div>

                <Button onClick={stop}><Icons.Stop /></Button>
                <Button onClick={togglePlay} active={isPlaying}>
                    {isPlaying ? <Icons.Pause /> : <Icons.Play />}
                </Button>
                <Button><Icons.Record /></Button>
            </div>

            <div className="center-display" style={{
                display: 'flex',
                gap: '10px'
            }}>
                <div style={{
                    color: '#aaa',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    marginRight: '10px'
                }}>
                    {projectName}
                </div>
                <div style={{
                    backgroundColor: '#111',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid #000',
                    fontFamily: 'monospace',
                    color: '#03dac6',
                    fontSize: '1.1em',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)'
                }}>
                    <span ref={tempoRef}>{initialTempo.toFixed(2)} BPM</span>
                    <span style={{ color: '#555' }}>|</span>
                    {/* Time Signature */}
                    <div style={{ display: 'flex', alignItems: 'center', color: '#e8c64d', gap: '2px' }}>
                        <input
                            type="number"
                            min="1" max="64"
                            value={timeSignature.numerator}
                            onChange={e => setTimeSignature({ ...timeSignature, numerator: parseInt(e.target.value) || 4 })}
                            style={inputStyle}
                        />
                        <span>/</span>
                        <select
                            value={timeSignature.denominator}
                            onChange={e => setTimeSignature({ ...timeSignature, denominator: parseInt(e.target.value) })}
                            style={{
                                ...inputStyle,
                                width: 'auto',
                                appearance: 'none',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                        </select>
                    </div>
                    <span style={{ color: '#555' }}>|</span>
                    <span ref={positionRef}>1 / 4 / 1.00</span>
                    <span style={{ color: '#555' }}>|</span>
                    <span ref={timeRef} style={{ color: '#aaa' }}>0:00.00</span>
                </div>
            </div>

            <div className="right-controls" style={{ display: 'flex', gap: '4px', position: 'relative' }}>
                <div style={{ display: 'flex' }}>
                    <Button
                        onClick={() => setMetronomeOn(!metronomeOn)}
                        active={metronomeOn}
                    >
                        <Icons.Metronome active={metronomeOn} />
                    </Button>
                    <Button
                        onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                        active={isSettingsOpen}
                        color="#888"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z" /></svg>
                    </Button>
                </div>

                {/* Popover */}
                {isSettingsOpen && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '10px'
                    }}>
                        {/* Dynamic Import or standard import if possible. Circular dependency? No. */}
                        {React.createElement(require('./MetronomeSettings').default)}
                    </div>
                )}

                <Button>Mixer</Button>
            </div>
        </div>
    );
};

export default TransportBar;
