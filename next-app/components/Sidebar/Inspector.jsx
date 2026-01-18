import React, { useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import DraggableNumberInput from '../Common/DraggableNumberInput';

const Inspector = () => {
    const { selection, deleteTempoPoint, tempoSettings, updateTempoPoint, tracks, updateTrack } = useProject();

    // --- Hooks (Always Top Level) ---
    // Scale State
    const [scalePct, setScalePct] = useState(100);

    // Reset scale when selection changes
    // Guard against missing selection inside effect dependency check logic if needed, 
    // but selection.ids is undefined if selection is null. 
    // Optional chaining in dependency array is supported in recent React/Builds, but safe variable preferred.
    const selectedIds = selection?.ids;
    useEffect(() => {
        setScalePct(100);
    }, [selectedIds]);


    // Fixed Width Container Style
    const containerStyle = {
        width: 'var(--inspector-width)',
        minWidth: 'var(--inspector-width)',
        height: '100%',
        backgroundColor: 'var(--bg-panel)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        padding: '10px',
        boxSizing: 'border-box',
        color: '#e0e0e0',
        overflowY: 'auto'
    };

    if (!selection || (!selection.type)) {
        // Empty State (but fixed width)
        return (
            <div style={containerStyle}>
                <div style={{ color: '#666', fontStyle: 'italic', marginTop: '20px', textAlign: 'center' }}>
                    No Selection
                </div>
            </div>
        );
    }

    // --- Audio Track Inspector ---
    if (selection.type === 'TRACK') {
        const id = selection.ids[0];
        const track = tracks.find(t => t.id === id);

        if (!track) return <div style={containerStyle}>Track Not Found</div>;

        const handleSensitivityChange = (val) => {
            updateTrack(id, { transientSensitivity: val / 100 });
        };

        // Default to 0.5 if undefined
        const currentSens = track.transientSensitivity !== undefined ? track.transientSensitivity : 0.5;

        return (
            <div style={containerStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {track.title}
                </h3>

                <div style={{ fontSize: '11px', color: '#888', marginBottom: '20px' }}>Type: Audio Track</div>

                <DraggableNumberInput
                    label="Transient Sensitivity (%)"
                    value={Math.round(currentSens * 100 * 10) / 10} // Display 1 decimal place if needed
                    onChange={handleSensitivityChange}
                    step={1}      // 1%
                    fineStep={0.1} // 0.1%
                    min={0}
                    max={100}
                />

                <div style={{ fontSize: '10px', color: '#666', marginTop: '5px', lineHeight: '1.4' }}>
                    Adjusts the sensitivity of the transient detection visualization (0% - 100%).
                </div>
            </div>
        );
    }

    // --- Tempo Point Inspector ---
    if (selection.type === 'TEMPO_POINT') {
        const selectedIdsValid = selection.ids || [];
        const count = selectedIdsValid.length;

        // Scale State Management (Logic moved mainly to Event Handlers, logic here uses state)
        // ...

        if (count === 0) return <div style={containerStyle}>No Selection</div>;

        // Get points
        const points = tempoSettings.points.filter(p => selectedIdsValid.includes(p.id));
        const isInitSelected = points.some(p => p.id === 'init');

        // Calculate Averages
        const avgValue = points.reduce((sum, p) => sum + p.value, 0) / count;
        const avgBar = points.reduce((sum, p) => sum + p.bar, 0) / count;

        const handleValueChange = (newVal) => {
            const delta = newVal - avgValue;
            selectedIds.forEach(id => {
                const p = points.find(pt => pt.id === id);
                if (p) {
                    let nextVal = p.value + delta;
                    nextVal = Math.max(tempoSettings.min, Math.min(tempoSettings.max, nextVal));
                    updateTempoPoint(id, { value: nextVal });
                }
            });
        };

        const handleScaleChange = (newScale) => {
            // Prevent 0 or negative scale to avoid collapse that can't be undone
            const safeScale = Math.max(0.1, newScale);

            const ratio = safeScale / scalePct; // New / Old

            // Pivot around CURRENT Average (which effectively stays same if scaling symmetric distribution)
            // But if we clamped things before, average might have shifted.
            // Using current average is the most robust "Center".

            selectedIds.forEach(id => {
                const p = points.find(pt => pt.id === id);
                if (p) {
                    const diff = p.value - avgValue;
                    let nextVal = avgValue + (diff * ratio);
                    nextVal = Math.max(tempoSettings.min, Math.min(tempoSettings.max, nextVal));
                    updateTempoPoint(id, { value: nextVal });
                }
            });

            setScalePct(safeScale);
        };

        const handleBarChange = (newBar) => {
            // ... existing bar logic ... (Keeping it condensed for replacement matching if strict)
            // Wait, I am replacing the whole block.
            // I need to paste the Full handleBarChange logic again or it gets deleted.
            // I'll grab it from content.
            const delta = newBar - avgBar;
            let limitLeft = Infinity; let limitRight = Infinity;
            if (isInitSelected) { limitLeft = 0; limitRight = 0; }
            else {
                const allSorted = [...tempoSettings.points].sort((a, b) => a.bar - b.bar);
                selectedIds.forEach(id => {
                    const p = allSorted.find(pt => pt.id === id);
                    if (!p) return;
                    let prev = null; const idx = allSorted.indexOf(p);
                    for (let i = idx - 1; i >= 0; i--) { if (!selectedIds.includes(allSorted[i].id)) { prev = allSorted[i]; break; } }
                    let next = null;
                    for (let i = idx + 1; i < allSorted.length; i++) { if (!selectedIds.includes(allSorted[i].id)) { next = allSorted[i]; break; } }
                    const spaceLeft = prev ? (p.bar - prev.bar) : p.bar;
                    const spaceRight = next ? (next.bar - p.bar) : Infinity;
                    limitLeft = Math.min(limitLeft, spaceLeft);
                    limitRight = Math.min(limitRight, spaceRight);
                });
            }
            let finalDelta = delta;
            const epsilon = 0.0001;
            if (finalDelta < 0 && Math.abs(finalDelta) > limitLeft) finalDelta = -limitLeft + epsilon;
            else if (finalDelta > 0 && finalDelta > limitRight) finalDelta = limitRight - epsilon;

            selectedIds.forEach(id => {
                if (id === 'init') return;
                const p = points.find(pt => pt.id === id);
                if (p) updateTempoPoint(id, { bar: p.bar + finalDelta });
            });
        };

        const handleDelete = () => {
            selectedIds.forEach(id => deleteTempoPoint(id));
        };

        return (
            <div style={containerStyle}>
                <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Tempo Points ({count})
                </h3>

                {count > 1 && <div style={{ fontSize: '11px', color: '#888', marginBottom: '10px' }}>Batch Editing Active</div>}

                {count === 1 && (
                    <div style={{ marginBottom: '10px', fontSize: '10px', color: '#666' }}>ID: {selectedIds[0]}</div>
                )}

                {/* Value (BPM) - Draggable */}
                <DraggableNumberInput
                    label={count > 1 ? "Average Value (BPM)" : "Value (BPM)"}
                    value={Math.round(avgValue * 100) / 100}
                    onChange={handleValueChange}
                    step={0.5}
                    fineStep={0.05}
                />

                {/* Scale Control (Only for Multi) */}
                {count > 1 && (
                    <DraggableNumberInput
                        label="Scale Variance (%)"
                        value={Math.round(scalePct * 10) / 10}
                        onChange={handleScaleChange}
                        step={1}
                        fineStep={0.1}
                        min={1}
                    />
                )}

                {/* Position - Draggable */}
                <DraggableNumberInput
                    label={count > 1 ? "Average Bar (Location)" : "Bar (Location)"}
                    value={Math.round(avgBar * 1000) / 1000}
                    onChange={handleBarChange}
                    step={0.25}
                    fineStep={0.01}
                    disabled={isInitSelected}
                />

                {isInitSelected && <div style={{ fontSize: '10px', color: 'orange', marginTop: '2px' }}>Initial Point Selected (Position Locked)</div>}

                <button
                    onClick={handleDelete}
                    style={{
                        width: '100%', padding: '8px', background: '#800000', color: '#fff', border: 'none', cursor: 'pointer', marginTop: '10px',
                        display: (isInitSelected && count === 1) ? 'none' : 'block'
                    }}
                >
                    Delete Point{count > 1 ? 's' : ''}
                </button>
            </div>
        );
    }

    return <div style={containerStyle}>Select an object</div>;
};

export default Inspector;
