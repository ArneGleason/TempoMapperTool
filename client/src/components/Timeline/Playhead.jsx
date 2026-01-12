import React from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { useView } from '../../contexts/ViewContext';

const Playhead = () => {
    // We subscribe to currentTime. 
    // In a high-perf app we might move the DOM directly via ref in the loop, 
    // but for now React state update loop (approx 60fps via context) is okay for MVP phase.
    const { currentTime, isPlaying, tempo } = usePlayer();
    const { pixelsPerBeat } = useView();

    // Derived pps
    const spb = 60 / tempo;
    const pixelsPerSecond = pixelsPerBeat / spb;

    const left = currentTime * pixelsPerSecond;

    return (
        <div className="playhead-container" style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            width: '100%',
            pointerEvents: 'none', // Letting clicks pass through to tracks
            zIndex: 50 // Above tracks, below sticky header? No, Playhead usually above headers or below? Standard is below sticky top ruler, above tracks.
        }}>
            {/* Play Line */}
            <div style={{
                position: 'absolute',
                left: left,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: '#fff',
                boxShadow: '0 0 4px rgba(255,255,255,0.5)',
                willChange: 'left',
                zIndex: 200
            }}>
                {/* Carrot / Head */}
                <div style={{
                    position: 'absolute',
                    top: '0px', // Align with bottom of ruler roughly
                    left: '-5px',
                    width: 0,
                    height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '10px solid #fff',
                }}></div>
            </div>
        </div>
    );
};

export default Playhead;
