import React from 'react';

const Inspector = () => {
    return (
        <div className="inspector" style={{
            width: 'var(--inspector-width)',
            minWidth: 'var(--inspector-width)', /* Force constraint */
            flexShrink: 0, /* Prevent collapse */
            backgroundColor: 'var(--bg-panel)',
            borderRight: '1px solid var(--border-light)',
            display: 'flex',
            flexDirection: 'column',
            padding: '10px'
        }}>
            <div style={{ marginBottom: '15px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '0.9em', color: 'var(--text-bright)' }}>Audio Track</h3>
                <div style={{
                    width: '100%', height: '80px', backgroundColor: '#333',
                    border: '1px solid var(--border-light)', position: 'relative'
                }}>
                    {/* Color picker area mockup */}
                    <div style={{ width: '20px', height: '100%', backgroundColor: 'var(--color-audio-wave)', position: 'absolute', left: 0 }}></div>
                </div>
            </div>

            <div className="fader-section" style={{ flex: 1 }}>
                <div style={{ fontSize: '0.8em' }}>Volume</div>
                {/* Fader mockup */}
                <div style={{ width: '40px', height: '200px', backgroundColor: '#111', margin: '10px auto', position: 'relative' }}>
                    <div style={{
                        width: '100%', height: '20px', backgroundColor: '#555',
                        position: 'absolute', top: '70%' // -10dB approx
                    }}></div>
                </div>
                <div style={{ textAlign: 'center', color: '#ffa500' }}>-10.0 dB</div>
            </div>
        </div>
    );
};

export default Inspector;
