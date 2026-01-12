import React, { useRef, useState, useEffect } from 'react';

const DraggableNumberInput = ({ value, onChange, step = 1, fineStep = 0.1, label, disabled = false }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);
    const dragStartRef = useRef(null); // { y, startVal }

    const handleMouseDown = (e) => {
        if (disabled) return;
        // Check if just clicking to focus (don't prevent default yet)
        // But we want to capture drag.
        // Strategy: Capture here. If move > threshold, start dragging.
        // Actually, for immediate response, simple mousedown -> move is best.
        // But we need to allow typing.
        // Standard behavior: Click = Focus. Click+Hold+Move = Drag.

        dragStartRef.current = {
            y: e.clientY,
            startVal: Number(value) || 0,
            moved: false
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);
    };

    const handleGlobalMouseMove = (e) => {
        if (!dragStartRef.current) return;
        const start = dragStartRef.current;
        const diffY = start.y - e.clientY; // Up = Positive

        if (!start.moved && Math.abs(diffY) > 3) {
            start.moved = true;
            setIsDragging(true);
            document.body.style.cursor = 'ns-resize';
        }

        if (start.moved) {
            const currentStep = e.shiftKey ? fineStep : step;
            // Sensitivity: 1 deltaY = 1 step? Might be too fast.
            // Let's do 1 step per 2 pixels or so.
            // User asked: "0.05 BPM adjustment... for every movement... detected up and down".
            // Implies pixel mapping.

            const change = diffY * currentStep;
            const newVal = start.startVal + change;

            // Round to sensible precision (e.g. 2 decimals)
            const rounded = Math.round(newVal * 100) / 100;

            onChange(rounded);
            e.preventDefault(); // Stop text selection
        }
    };

    const handleGlobalMouseUp = (e) => {
        if (dragStartRef.current && dragStartRef.current.moved) {
            // End drag
            e.preventDefault(); // Prevent click event on input
        }
        dragStartRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    // If we dragged, we want to blur the input so it doesn't stay focused? 
    // Or if we didn't drag, we focus.
    // The Input's native onClick/onFocus handles focus if we didn't prevent default.

    return (
        <div className="draggable-input-container" style={{ marginBottom: '10px' }}>
            {label && <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>}
            <input
                ref={inputRef}
                type="number"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                onMouseDown={handleMouseDown}
                disabled={disabled}
                style={{
                    width: '100%',
                    background: disabled ? '#1a1a1a' : '#222',
                    border: '1px solid #444',
                    color: disabled ? '#666' : '#fff',
                    padding: '4px',
                    cursor: disabled ? 'not-allowed' : (isDragging ? 'ns-resize' : 'text'), // 'ns-resize' hint?
                    // User cursor hint usually appears on hover if it's draggable-only.
                    // But this is mixed (type + drag).
                    // Maybe render a small "drag handle" or just use the input.
                }}
            />
        </div>
    );
};

export default DraggableNumberInput;
