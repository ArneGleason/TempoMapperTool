import React, { useRef, useState, useEffect } from 'react';
import { useProject } from '../../contexts/ProjectContext';
import { useView } from '../../contexts/ViewContext';
import TrackLane from './TrackLane';

const TempoLane = () => {
    const {
        tempoSettings, updateTempoSettings,
        addTempoPoint, updateTempoPoint,
        selection, selectItem, toggleSelectionItem, setSelectionItems, clearSelection
    } = useProject();

    const { min, max, points } = tempoSettings;
    const { pixelsPerBeat } = useView();

    const svgRef = useRef(null);

    // Drag State: we store "original" values to compute deltas for group/lasso
    const [dragState, setDragState] = useState(null);
    // { type: 'POINT', pointId: 'id', startX, startY, startValues: { id: { bar, value } } }

    const [ghostPoint, setGhostPoint] = useState(null);

    // Lasso State
    const [lassoStart, setLassoStart] = useState(null); // { x, y }
    const [lassoRect, setLassoRect] = useState(null); // { x, y, w, h }

    // Constants
    const Y_RANGE = max - min;
    const HEADER_HEIGHT = 0; // Relative to SVG

    // --- Helpers ---
    const getYForTempo = (tempo) => {
        if (Y_RANGE <= 0) return 50;
        const normalized = (tempo - min) / Y_RANGE;
        return (1 - normalized) * 100;
    };
    const getTempoForY = (yPercent) => {
        const normalized = 1 - (yPercent / 100);
        return min + (normalized * Y_RANGE);
    };
    const getXForBar = (bar) => bar * 4 * pixelsPerBeat;
    const getBarForX = (x) => x / pixelsPerBeat / 4;
    const snapBarToGrid = (bar) => {
        const gridInterval = 1 / 16;
        return Math.round(bar / gridInterval) * gridInterval;
    };

    // --- Interaction ---

    const handleGlobalMouseMove = (e) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        let mouseX = e.clientX - rect.left;
        let mouseY = e.clientY - rect.top;

        // DRAGGING POINTS
        if (dragState) {
            // Fine Tuning Logic (Shift Key)
            if (e.shiftKey) {
                const deltaX = e.clientX - dragState.startX;
                const deltaY = e.clientY - dragState.startY;
                const factor = 1 / 25; // 0.04

                // Effective Position relative to SVG
                // We project where the mouse WOULD be if it moved 1/25th the distance from the start point
                // Note: We need 'Start relative to rect' but rect might have moved (scroll).
                // Better: (StartGlobal + Delta*Factor) - RectLeft
                mouseX = (dragState.startX + deltaX * factor) - rect.left;
                mouseY = (dragState.startY + deltaY * factor) - rect.top;
            }

            // Calculate Global Deltas
            // Delta Y (Tempo)
            const currentYPercent = (mouseY / rect.height) * 100;
            const clampedY = Math.max(0, Math.min(100, currentYPercent));
            let newPrimaryTempo = getTempoForY(clampedY);
            newPrimaryTempo = Math.round(newPrimaryTempo * 10) / 10;

            // Primary Start
            const primaryStart = dragState.startValues[dragState.pointId];
            if (!primaryStart) return;

            const tempoDelta = newPrimaryTempo - primaryStart.value;

            // Delta X (Bar)
            const currentBarRaw = getBarForX(mouseX);
            const snappedBar = snapBarToGrid(currentBarRaw);
            let barDelta = snappedBar - primaryStart.bar;

            // Apply Constraints (Min/Max Delta)
            if (dragState.constraints) {
                barDelta = Math.max(dragState.constraints.minDelta, Math.min(dragState.constraints.maxDelta, barDelta));
            }

            // Apply to ALL selected points
            selection.ids.forEach(id => {
                const startVal = dragState.startValues[id];
                if (!startVal) return;

                let newTemp = startVal.value + tempoDelta;
                let newBar = startVal.bar + barDelta;

                if (id === 'init') {
                    newBar = 0; // Lock X (redundant if constraints set correct, but safe)
                }

                updateTempoPoint(id, { value: newTemp, bar: newBar });
            });
            return;
        }

        // LASSO
        if (lassoStart) {
            const x = Math.min(lassoStart.x, mouseX);
            const y = Math.min(lassoStart.y, mouseY);
            const w = Math.abs(mouseX - lassoStart.x);
            const h = Math.abs(mouseY - lassoStart.y);
            setLassoRect({ x, y, w, h });

            const newSelection = [];
            points.forEach(p => {
                const px = getXForBar(p.bar);
                const pyPercent = getYForTempo(p.value);
                // Fix: convert Y% to pixels for Lasso check
                const py = (pyPercent / 100) * LAN_HEIGHT;

                if (px >= x && px <= x + w && py >= y && py <= y + h) {
                    newSelection.push(p.id);
                }
            });

            setSelectionItems('TEMPO_POINT', newSelection);
            return;
        }

        // GHOST POINT (Create)
        const sorted = [...points].sort((a, b) => a.bar - b.bar);
        const mouseBar = getBarForX(mouseX);
        let activeSegment = null;
        for (let i = 0; i < sorted.length; i++) {
            const p1 = sorted[i];
            const p2 = sorted[i + 1];
            if (mouseBar >= p1.bar && (!p2 || mouseBar <= p2.bar)) {
                activeSegment = { p1, p2 };
                break;
            }
        }

        if (activeSegment) {
            const { p1, p2 } = activeSegment;
            let projectedTempo = p1.value;
            if (p2) {
                const ratio = (mouseBar - p1.bar) / (p2.bar - p1.bar);
                projectedTempo = p1.value + ratio * (p2.value - p1.value);
            } else {
                projectedTempo = p1.value;
            }
            const projectedYPercent = getYForTempo(projectedTempo);
            const mouseYPercent = (mouseY / rect.height) * 100;
            const distYPercent = Math.abs(mouseYPercent - projectedYPercent);
            const distYPx = (distYPercent / 100) * LAN_HEIGHT; // Fix Y px

            if (distYPx < 20) {
                const snappedBar = snapBarToGrid(mouseBar);
                let snapTempo = p1.value;
                if (p2) {
                    if (snappedBar <= p1.bar) snapTempo = p1.value;
                    else if (snappedBar >= p2.bar) snapTempo = p2.value;
                    else {
                        const ratio = (snappedBar - p1.bar) / (p2.bar - p1.bar);
                        snapTempo = p1.value + ratio * (p2.value - p1.value);
                    }
                }
                setGhostPoint({
                    bar: snappedBar,
                    value: snapTempo,
                    x: getXForBar(snappedBar),
                    yPercent: getYForTempo(snapTempo)
                });
                return;
            }
        }
        setGhostPoint(null);
    };

    const handleGlobalMouseUp = () => {
        setDragState(null);
        setLassoStart(null);
        setLassoRect(null);
    };

    // SVG Background Click
    const handleSvgMouseDown = (e) => {
        if (!ghostPoint && !dragState) {
            if (!e.shiftKey && !e.ctrlKey) {
                clearSelection();
            }
            const rect = svgRef.current.getBoundingClientRect();
            setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }
    };

    const handleSvgClick = (e) => {
        if (!dragState && !lassoStart && !lassoRect && ghostPoint) {
            const exists = points.some(p => Math.abs(p.bar - ghostPoint.bar) < 0.001);
            if (!exists) {
                addTempoPoint(ghostPoint.bar, ghostPoint.value);
                setGhostPoint(null);
            }
        }
    };

    const handlePointMouseDown = (e, pointId) => {
        e.stopPropagation();
        const point = points.find(p => p.id === pointId);
        if (!point) return;

        if (e.shiftKey) {
            toggleSelectionItem('TEMPO_POINT', pointId);
        } else {
            if (!selection.ids.includes(pointId)) {
                selectItem('TEMPO_POINT', pointId);
            }
        }

        // Determine Effective Selection (current state + this click)
        // If Shift, we updated state but it's pending.
        // It's safer to rely on 'willBeSelected' logic
        let willBeIds = selection.ids;
        if (e.shiftKey) {
            if (selection.ids.includes(pointId)) willBeIds = selection.ids.filter(i => i !== pointId);
            else willBeIds = [...selection.ids, pointId];
        } else {
            if (!selection.ids.includes(pointId)) willBeIds = [pointId];
        }

        const startValues = {};
        willBeIds.forEach(id => {
            const p = points.find(pt => pt.id === id);
            if (p) startValues[id] = { bar: p.bar, value: p.value };
        });

        // CALCULATE CONSTRAINTS
        const sorted = [...points].sort((a, b) => a.bar - b.bar);
        const unselected = sorted.filter(p => !willBeIds.includes(p.id));

        let minDelta = -Infinity;
        let maxDelta = Infinity;

        // If 'init' is selected, lock horizontal
        if (willBeIds.includes('init')) {
            minDelta = 0;
            maxDelta = 0;
        } else {
            willBeIds.forEach(id => {
                const p = points.find(pt => pt.id === id);
                if (!p) return;
                const startBar = p.bar;

                // Find nearest unselected on Left
                const prevPoints = unselected.filter(u => u.bar <= startBar);
                const prevBar = prevPoints.length > 0 ? prevPoints[prevPoints.length - 1].bar : 0;

                // Find nearest unselected on Right
                const nextPoints = unselected.filter(u => u.bar >= startBar);
                const nextBar = nextPoints.length > 0 ? nextPoints[0].bar : Infinity;

                const myMinDelta = prevBar - startBar;
                const myMaxDelta = nextBar - startBar;

                minDelta = Math.max(minDelta, myMinDelta);
                maxDelta = Math.min(maxDelta, myMaxDelta);
            });
        }

        setDragState({
            pointId,
            startX: e.clientX,
            startY: e.clientY,
            startValues,
            constraints: { minDelta, maxDelta }
        });
    };

    useEffect(() => {
        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, [dragState, lassoStart, points, pixelsPerBeat, max, min, selection]);

    // --- Rendering ---

    // Auto-restore Init
    useEffect(() => {
        if (!points.some(p => p.id === 'init')) {
            const newPoints = [...points, { id: 'init', bar: 0, value: 120 }].sort((a, b) => a.bar - b.bar);
            // updateTempoSettings({ points: newPoints }); // Safe? 
        }
    }, [points.length]);

    // SVG Height is fixed at 150px based on TrackLane prop
    const LAN_HEIGHT = 150;

    const sortedPoints = [...points].sort((a, b) => a.bar - b.bar);

    let pathD = "";
    if (sortedPoints.length > 0) {
        const firstP = sortedPoints[0];
        const firstX = getXForBar(firstP.bar);
        const firstYPercent = getYForTempo(firstP.value);
        const firstY = (firstYPercent / 100) * LAN_HEIGHT;

        if (firstX > 0) pathD += `M 0 ${firstY} L ${firstX} ${firstY}`;
        else pathD += `M ${firstX} ${firstY}`;

        for (let i = 1; i < sortedPoints.length; i++) {
            const p = sortedPoints[i];
            const x = getXForBar(p.bar);
            const yPercent = getYForTempo(p.value);
            const y = (yPercent / 100) * LAN_HEIGHT;
            pathD += ` L ${x} ${y}`;
        }
        const lastP = sortedPoints[sortedPoints.length - 1];
        const lastYPercent = getYForTempo(lastP.value);
        const lastY = (lastYPercent / 100) * LAN_HEIGHT;
        const endX = Math.max(window.innerWidth * 2, getXForBar(lastP.bar + 100));
        pathD += ` L ${endX} ${lastY}`;
    }

    const headerExtra = (
        <div style={{ display: 'flex', gap: '5px', fontSize: '10px', color: '#ccc', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Max:</span>
                <input type="number" value={max} onChange={(e) => updateTempoSettings({ max: Number(e.target.value) })}
                    style={{ width: '40px', background: '#333', border: 'none', color: '#fff', fontSize: '10px' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Min:</span>
                <input type="number" value={min} onChange={(e) => updateTempoSettings({ min: Number(e.target.value) })}
                    style={{ width: '40px', background: '#333', border: 'none', color: '#fff', fontSize: '10px' }} />
            </div>
        </div>
    );

    return (
        <TrackLane title="Tempo Map" color="var(--color-tempo-main)" height={`${LAN_HEIGHT}px`} headerExtra={headerExtra} hideControls={true}>
            <div style={{
                width: '100%', height: '100%', backgroundColor: 'var(--color-tempo-lane)', position: 'relative'
            }}>
                {/* Background Grid Lines */}
                <div style={{ position: 'absolute', top: '0%', left: 0, width: '100%', height: '1px', borderTop: '1px dashed rgba(255,255,255,0.03)' }}></div>
                <div style={{ position: 'absolute', top: '25%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', top: '50%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
                <div style={{ position: 'absolute', top: '75%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>
                <div style={{ position: 'absolute', bottom: '0%', width: '100%', height: '1px', background: 'rgba(255,255,255,0.05)' }}></div>

                {/* Tempo Vector Area */}
                <svg
                    ref={svgRef}
                    width="100%" height="100%"
                    style={{ position: 'absolute', top: 0, left: 0, cursor: ghostPoint ? 'pointer' : 'default', overflow: 'visible', zIndex: 10 }}
                    onMouseDown={handleSvgMouseDown}
                    onClick={handleSvgClick}
                >
                    {/* The Line */}
                    <path
                        d={pathD}
                        fill="none" stroke="#00befc" strokeWidth="3"
                        style={{ pointerEvents: 'none' }}
                    />

                    {/* Ghost Point */}
                    {ghostPoint && !dragState && !lassoRect && (
                        <circle
                            cx={ghostPoint.x} cy={(ghostPoint.yPercent / 100) * LAN_HEIGHT} r="5"
                            fill="rgba(255,255,255,0.5)" stroke="white" strokeWidth="1"
                            style={{ pointerEvents: 'none' }}
                        />
                    )}

                    {/* The Points */}
                    {sortedPoints.map(p => {
                        const x = getXForBar(p.bar);
                        const yPercent = getYForTempo(p.value);
                        const y = (yPercent / 100) * LAN_HEIGHT;
                        const isSelected = selection?.ids?.includes(p.id);
                        const isInit = p.id === 'init';

                        return (
                            <g key={p.id} transform={`translate(${x}, ${y})`}>
                                <circle
                                    r={isSelected ? 6 : 4}
                                    fill={isSelected ? "#fff" : (isInit ? "var(--color-primary)" : "#00befc")}
                                    stroke={isSelected ? '#00befc' : 'none'}
                                    strokeWidth={2}
                                    style={{ cursor: 'move' }}
                                    onMouseDown={(e) => handlePointMouseDown(e, p.id)}
                                />
                            </g>
                        );
                    })}

                    {/* Lasso Rect */}
                    {lassoRect && (
                        <rect
                            x={lassoRect.x} y={lassoRect.y} width={lassoRect.w} height={lassoRect.h}
                            fill="rgba(0, 190, 252, 0.2)" stroke="#00befc" strokeDasharray="4"
                            style={{ pointerEvents: 'none' }}
                        />
                    )}
                </svg>
            </div>
        </TrackLane>
    );
};

export default TempoLane;
