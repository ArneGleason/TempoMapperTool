import React, { useRef, useState, useEffect } from 'react';

const DraggableNumberInput = ({ value, onChange, step = 1, fineStep = 0.1, label, disabled = false, min = -Infinity, max = Infinity }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef(null);
    const dragStartRef = useRef(null); // { y, startVal }

    // Sync local value when external value changes (unless we are typing? No, we trust the parent source of truth).
    // If we are strictly typing, value Prop shouldn't change, so this effect won't fire.
    // If we drag, value Prop changes, and we want to see it.
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    const handleMouseDown = (e) => {
        if (disabled) return;
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
            const change = diffY * currentStep;
            let newVal = start.startVal + change;

            // Clamp during drag? Yes, usually good.
            newVal = Math.max(min, Math.min(max, newVal));

            const rounded = Math.round(newVal * 100) / 100;

            // Update Parent immediately (Drag is hot)
            onChange(rounded);
            // Updating prop will trigger useEffect -> update localValue.
            e.preventDefault();
        }
    };

    const handleGlobalMouseUp = (e) => {
        if (dragStartRef.current && dragStartRef.current.moved) {
            e.preventDefault();
        }
        dragStartRef.current = null;
        setIsDragging(false);
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
    };

    const commit = () => {
        let val = parseFloat(localValue);
        if (isNaN(val)) val = value; // Revert if invalid
        // Clamp
        val = Math.max(min, Math.min(max, val));
        onChange(val);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            commit();
            inputRef.current.blur();
        }
    };

    const handleBlur = () => {
        commit();
    };

    const handleChange = (e) => {
        setLocalValue(e.target.value);
    };

    return (
        <div className="draggable-input-container" style={{ marginBottom: '10px' }}>
            {label && <div style={{ fontSize: '10px', color: '#888', marginBottom: '4px' }}>{label}</div>}
            <input
                ref={inputRef}
                type="text" // Use text to allow typing "." freely
                value={localValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                onMouseDown={handleMouseDown}
                disabled={disabled}
                style={{
                    width: '100%',
                    background: disabled ? '#1a1a1a' : '#222',
                    border: '1px solid #444',
                    color: disabled ? '#666' : '#fff',
                    padding: '4px',
                    cursor: disabled ? 'not-allowed' : (isDragging ? 'ns-resize' : 'text'),
                }}
            />
        </div>
    );
};

export default DraggableNumberInput;
