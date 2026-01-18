import React, { useMemo } from 'react';
import { useView } from '../../contexts/ViewContext';

const GridOverlay = () => {
    const { pixelsPerBeat, totalDuration } = useView();

    // Determine grid density based on zoom
    // We want to show lines if the gap between them is at least X pixels.
    // Standard rule of thumb: ~10-15px min spacing.
    const minSpacing = 15;

    const showBars = true; // Always show bars (presumably we don't zoom out THAT far, or we handle it differently)
    const showBeats = pixelsPerBeat >= minSpacing;
    const show8ths = (pixelsPerBeat / 2) >= minSpacing;
    const show16ths = (pixelsPerBeat / 4) >= minSpacing;
    const show32nds = (pixelsPerBeat / 8) >= minSpacing;
    const show64ths = (pixelsPerBeat / 16) >= minSpacing;

    // Calculate lines
    // We assume 4/4 time signature for now
    const beatsPerBar = 4;
    // totalBeats estimate (assuming tempo is constant or using seconds is tricky?)
    // Wait, in Beat-Based View, X is pure BEATS * pixelsPerBeat.
    // Time is variable. But grid is MUSICAL. So X is linear to Beats.
    // Total Beats?
    // We don't have totalBeats in ViewContext, only totalDuration (seconds).
    // But we are in Beat View!
    // Wait, calculating totalBeats from TotalDuration requires Tempo.
    // But Render is purely X based on pixelsPerBeat.
    // Let's assume a "safe" max beat count or pass it in?
    // Or we render effectively infinite? No.
    // We should probably know the Max Beat count.

    // For now, let's just render based on totalDuration * maxTempo (e.g. 200) to be safe?
    // Or better: usePlayer or useProject to get max beat?
    // No, ViewContext has totalDuration.
    // Let's assume 120bpm average = 2 beats per second.
    // totalBeats = totalDuration * (tempo / 60).
    // Since tempo is variable, exact total beats is hard if we don't have the map.
    // BUT, visual grid is just a pattern.
    // Let's render enough to cover the Width.
    // Width = totalDuration * (what?).
    // Wait, totalWidth IS calculated in TrackLane as totalDuration * pixelsPerSecond.
    // That means the existing container is sized by Time.
    // If tempo changes, Width pixel size changes.
    // BUT Grid is Musical.
    // If Tempo = 60 (1 beat = 1 sec). Width = 10s * 1 beat/s * 100 px/beat = 1000px.
    // If Tempo = 120 (2 beat = 1 sec). Width = 10s * 2 beat/s * 100 px/beat = 2000px.
    // So visual width depends on tempo.
    // BUT we don't have global tempo here cleanly without hooking PlayerContext again.
    // But wait, if this overlay is inside TrackLane, its parent has width.
    // We can just fill 100% width?
    // BUT the lines need to be at specific offsets.
    // X = BeatIndex * pixelsPerBeat.
    // So we just iterate B from 0 to ... Width / pixelsPerBeat.

    // We need the width of the container in Pixels to know how many lines to draw.
    // Or we rely on ViewContext having a Ref to the container size?
    // Actually, `TrackLane` sets width to `contentWidth`.
    // We can just guess a large number or use `totalDuration` assuming a max tempo.
    // Let's rely on standard assumption:
    // If we just render a LOT of lines it might be slow.
    // React Virtualization is ideal.
    // For MVP (10s clip), just render 100 bars is fine.

    const lines = useMemo(() => {
        const allLines = [];
        const maxBeats = 1000; // TODO: Dynamic length

        for (let b = 0; b < maxBeats; b++) {
            // Beat Start X
            const beatX = b * pixelsPerBeat;

            // Is this a Bar start? (Assuming 4/4)
            const isBar = (b % 4 === 0);

            if (isBar) {
                allLines.push({ x: beatX, type: 'bar' });
            } else if (showBeats) {
                allLines.push({ x: beatX, type: 'beat' });
            }

            // Sub-divisions between this beat and next beat
            // We need to fill [beatX, beatX + pixelsPerBeat)

            // 8ths (1 line in middle)
            if (show8ths) {
                allLines.push({ x: beatX + (0.5 * pixelsPerBeat), type: '8th' });
            }

            // 16ths (2 lines, at 0.25 and 0.75)
            if (show16ths) {
                allLines.push({ x: beatX + (0.25 * pixelsPerBeat), type: '16th' });
                allLines.push({ x: beatX + (0.75 * pixelsPerBeat), type: '16th' });
            }

            // 32nds (4 lines: 0.125, 0.375, 0.625, 0.875)
            if (show32nds) {
                allLines.push({ x: beatX + (0.125 * pixelsPerBeat), type: '32nd' });
                allLines.push({ x: beatX + (0.375 * pixelsPerBeat), type: '32nd' });
                allLines.push({ x: beatX + (0.625 * pixelsPerBeat), type: '32nd' });
                allLines.push({ x: beatX + (0.875 * pixelsPerBeat), type: '32nd' });
            }

            // 64ths... (8 lines) - keeping it simple for now, usually overdrive
            if (show64ths) {
                for (let k = 1; k < 16; k += 2) { // 1/16, 3/16, 5/16... intervals of 1/16 beat? No 1/16 of beat is 64th note?
                    // 1 beat = 4 x 16th notes.
                    // 1 beat = 8 x 32nd notes.
                    // 1 beat = 16 x 64th notes.
                    // We already drew 0, 2, 4, 6, 8, 10, 12, 14 (evens are covered by higher orders).
                    // We need odd 1/16ths.
                    allLines.push({ x: beatX + (k / 16 * pixelsPerBeat), type: '64th' });
                }
            }
        }

        return allLines;

    }, [pixelsPerBeat, showBeats, show8ths, show16ths, show32nds, show64ths]);

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden' }}>
            {lines.map((line, i) => (
                <div key={i} style={{
                    position: 'absolute',
                    left: line.x,
                    top: 0,
                    bottom: 0,
                    width: '1px',
                    backgroundColor: line.type === 'bar' ? 'rgba(255,255,255,0.3)' :
                        line.type === 'beat' ? 'rgba(255,255,255,0.15)' :
                            line.type === '8th' ? 'rgba(255,255,255,0.1)' :
                                line.type === '16th' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.03)'
                }}></div>
            ))}
        </div>
    );
};

export default GridOverlay;
