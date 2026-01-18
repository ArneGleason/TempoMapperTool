'use client';
import React, { useEffect, useRef } from 'react';

const Modal = ({ isOpen, title, message, type, inputProps, onConfirm, onCancel, confirmText = 'OK', cancelText = 'Cancel' }) => {
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen && type === 'prompt' && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isOpen, type]);

    if (!isOpen) return null;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onConfirm();
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
        }} onClick={onCancel}>
            <div style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '20px',
                minWidth: '400px',
                maxWidth: '90%',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px'
            }} onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>

                {title && <h3 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>{title}</h3>}

                {message && <div style={{ color: '#ccc', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{message}</div>}

                {type === 'prompt' && (
                    <input
                        ref={inputRef}
                        type="text"
                        style={{
                            backgroundColor: '#111',
                            border: '1px solid #555',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '4px',
                            width: '100%',
                            boxSizing: 'border-box',
                            fontSize: '14px'
                        }}
                        {...inputProps}
                    />
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    {type !== 'alert' && (
                        <button onClick={onCancel} style={{
                            background: 'transparent',
                            border: '1px solid #555',
                            color: '#ccc',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }} hover={{ backgroundColor: '#ffffff10' }}>
                            {cancelText}
                        </button>
                    )}
                    <button onClick={onConfirm} style={{
                        background: '#03dac6',
                        border: 'none',
                        color: '#000',
                        padding: '6px 16px',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
