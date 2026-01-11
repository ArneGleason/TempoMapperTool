import React from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import FileMenu from './FileMenu';
import { useProjectActions } from '../../logic/ProjectActions'; // Wrapper for actions

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
    const { isPlaying, togglePlay, stop, currentTime, tempo } = usePlayer();

    // Format time as M:S:ms
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60).toString().padStart(2, '0');
    const ms = Math.floor((currentTime % 1) * 100).toString().padStart(2, '0');

    // Beat calc (fake for now, linear based on fixed tempo)
    const totalBeats = (currentTime / 60) * tempo;
    const bar = Math.floor(totalBeats / 4) + 1;
    const beat = Math.floor(totalBeats % 4) + 1;
    const tick = Math.floor((totalBeats % 1) * 96).toString().padStart(2, '0');

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
            zIndex: 10
        }}>
            <div className="left-controls" style={{ display: 'flex', gap: '4px' }}>
                <FileMenu />
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
                    <span>{tempo.toFixed(2)} BPM</span>
                    <span style={{ color: '#555' }}>|</span>
                    <span>{bar}.{beat}.{tick}</span>
                    <span style={{ color: '#555' }}>|</span>
                    <span style={{ color: '#aaa' }}>{minutes}:{seconds}.{ms}</span>
                </div>
            </div>

            <div className="right-controls" style={{ display: 'flex', gap: '4px' }}>
                <Button><Icons.Metronome active={false} /></Button>
                <Button>Mixer</Button>
            </div>
        </div>
    );
};

export default TransportBar;
