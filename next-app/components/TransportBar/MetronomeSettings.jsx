'use client';
import React from 'react';
import DraggableNumberInput from '../Common/DraggableNumberInput';
import { usePlayer } from '../../contexts/PlayerContext';

const MetronomeSettings = ({ style }) => {
    const {
        metronomeVolume, setMetronomeVolume,
        metronomeAccent, setMetronomeAccent
    } = usePlayer();

    return (
        <div style={{
            width: '200px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '4px',
            padding: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            ...style
        }}>
            <h4 style={{ margin: 0, fontSize: '11px', color: '#aaa', textTransform: 'uppercase' }}>Metronome Settings</h4>

            <DraggableNumberInput
                label="Volume (0.0 - 1.0)"
                value={metronomeVolume}
                onChange={setMetronomeVolume}
                step={0.1}
                fineStep={0.01}
                min={0}
                max={1}
            />

            <DraggableNumberInput
                label="Accent Level (Rel to Beat 1)"
                value={metronomeAccent}
                onChange={setMetronomeAccent}
                step={0.1}
                fineStep={0.01}
                min={0}
                max={1}
            />

            <div style={{ fontSize: '10px', color: '#666', fontStyle: 'italic' }}>
                Beat 1 is always 100%. Others scale by Accent Level.
            </div>
        </div>
    );
};

export default MetronomeSettings;
