import React, { useEffect, useRef, useState } from 'react';
import { useView } from '../../contexts/ViewContext';
import { useProject } from '../../contexts/ProjectContext';
import { TempoUtils } from '../../utils/TempoUtils';

const WarpedWaveform = ({ src, height = 100, sensitivity = 1.0, startBeat = 0, offset = 0 }) => {
    const canvasRef = useRef(null);
    const { pixelsPerBeat } = useView();
    const { tempoSettings } = useProject();

    const [audioBuffer, setAudioBuffer] = useState(null);
    const [status, setStatus] = useState('init');

    // 1. Fetch & Decode Audio
    useEffect(() => {
        if (!src) return;
        setStatus('loading');

        let active = true;
        const ctx = new (window.AudioContext || window.webkitAudioContext)();

        fetch(src)
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => {
                if (!active) return;
                setStatus('decoding');
                return ctx.decodeAudioData(arrayBuffer);
            })
            .then(decodedBuffer => {
                if (!active) return;
                setAudioBuffer(decodedBuffer);
                setStatus('ready');
            })
            .catch(err => {
                console.error("Audio Load Error", err);
                setStatus('error');
            });

        return () => { active = false; ctx.close(); };
    }, [src]);

    // 2. Render Canvas
    useEffect(() => {
        if (!audioBuffer || !canvasRef.current || !tempoSettings.points) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const bufferData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;
        const totalSamples = bufferData.length;
        const durationSec = audioBuffer.duration;

        // --- Hi-DPI Setup ---
        const dpr = window.devicePixelRatio || 1;

        // Calculate Total Beats Covered by Audio
        // End Global Time = Start Global Time + Duration
        const endBeat = TempoUtils.getBeatAtTime(offset + durationSec, tempoSettings.points);
        const durationBeats = endBeat - startBeat;

        const cssWidth = Math.ceil(durationBeats * pixelsPerBeat);

        // Set actual canvas size (CSS pixels * DPR)
        canvas.width = cssWidth * dpr;
        canvas.height = height * dpr;

        // Set CSS size
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${height}px`;

        // Normalize scaling
        ctx.scale(dpr, dpr);

        // Draw Background
        ctx.clearRect(0, 0, cssWidth, height);

        const center = height / 2;
        const ampScale = height / 2;
        const step = 1; // Pixels

        // Styling Constants
        const colorBase = { r: 30, g: 80, b: 40 }; // Dark Green
        const colorTransient = { r: 255, g: 255, b: 0 }; // Bright Yellow

        let prevMax = 0;

        for (let x = 0; x < cssWidth; x += step) {
            // Mapping Logic:
            // x (pixels) -> Relative Beat (from audio start) -> Global Beat -> Global Time -> Local Time
            const relativeBeat = x / pixelsPerBeat;
            const globalBeat = startBeat + relativeBeat;

            const globalTime = TempoUtils.getTimeAtBeat(globalBeat, tempoSettings.points);

            // Map Global Time to Audio Local Sample Index
            const localTime = globalTime - offset;

            if (localTime < 0) continue; // Should not happen if x starts at 0 and offset matches startBeat

            const idx = Math.floor(localTime * sampleRate);

            // Optimization: Calculate next sample index to determine step
            const nextBeat = (x + step) / pixelsPerBeat;
            const nextGlobalBeat = startBeat + nextBeat;
            const nextGlobalTime = TempoUtils.getTimeAtBeat(nextGlobalBeat, tempoSettings.points);
            const nextLocalTime = nextGlobalTime - offset;
            const nextIdx = Math.floor(nextLocalTime * sampleRate);

            if (idx >= totalSamples) break;

            // Find Max Amp
            let maxVal = 0;
            const rangeEnd = Math.min(nextIdx, totalSamples);

            // Optimization: If range is large (zoomed out), we can skip samples if performance issues arise.
            // But we want Supersampling. A basic step if range is HUGE (>1000 samples) might be wise.
            const iterStep = (rangeEnd - idx > 1000) ? 10 : 1;

            for (let j = idx; j < rangeEnd; j += iterStep) {
                const val = Math.abs(bufferData[j]);
                if (val > maxVal) maxVal = val;
            }
            if (rangeEnd <= idx) {
                maxVal = Math.abs(bufferData[idx] || 0);
            }

            // Transient Logic
            // Detect positive edge (Attack)
            const delta = maxVal - prevMax;

            // Sensitivity Logic
            // Sensitivity 1.0 -> Normal delta creates color.
            // Higher sensitivity -> Smaller delta creates Yellow.
            // Factor: 0 (Green) -> 1 (Yellow).
            // Threshold for visibility?
            // Let's rely on mapping.
            // Delta is typically 0 to 1 (if extremely sharp).
            // Usually 0 to 0.5.
            // Factor = delta * sensitivity * 5 (gain?).
            const factor = Math.min(1, Math.max(0, delta * sensitivity * 4));

            // Interpolate Color
            const r = Math.round(colorBase.r + (colorTransient.r - colorBase.r) * factor);
            const g = Math.round(colorBase.g + (colorTransient.g - colorBase.g) * factor);
            const b = Math.round(colorBase.b + (colorTransient.b - colorBase.b) * factor);

            ctx.fillStyle = `rgb(${r},${g},${b})`;

            // Update Prev
            // Falloff for smooth visual? If we just set prevMax = maxVal, then sustain is Green. Correct.
            // But if maxVal drops, we want Green.
            prevMax = maxVal;

            // Draw Vertical Bar (fillRect)
            // Centered
            const h = Math.max(1, maxVal * ampScale); // Ensure at least 1px height
            ctx.fillRect(x, center - h, 1, h * 2);
        }

    }, [audioBuffer, tempoSettings.points, pixelsPerBeat, height, sensitivity, startBeat, offset]);

    return (
        <div className="warped-waveform" style={{ width: '100%', height: '100%', position: 'relative' }}>
            {status === 'loading' && <div style={{ color: 'white', fontSize: '10px' }}>Loading Audio...</div>}
            <canvas ref={canvasRef} style={{ display: 'block' }} />
        </div>
    );
};

export default WarpedWaveform;
