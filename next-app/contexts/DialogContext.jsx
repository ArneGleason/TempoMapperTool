import React, { createContext, useContext, useState, useCallback } from 'react';
import Modal from '../components/UI/Modal';

const DialogContext = createContext();

export const DialogProvider = ({ children }) => {
    const [dialog, setDialog] = useState({
        isOpen: false,
        type: 'alert', // alert, confirm, prompt
        title: '',
        message: '',
        inputValue: '',
        resolve: null
    });

    const openDialog = useCallback((config) => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                type: config.type || 'alert',
                title: config.title || '',
                message: config.message || '',
                inputValue: config.defaultValue || '',
                resolve
            });
        });
    }, []);

    const closeDialog = (result) => {
        if (dialog.resolve) dialog.resolve(result);
        setDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = () => {
        if (dialog.type === 'prompt') {
            closeDialog(dialog.inputValue);
        } else {
            closeDialog(true);
        }
    };

    const handleCancel = () => {
        if (dialog.type === 'alert') {
            closeDialog(true); // Alert only has OK
        } else {
            closeDialog(null); // Return null/false for cancel
        }
    };

    // Public API
    const alert = (message, title = 'Alert') => openDialog({ type: 'alert', title, message });
    const confirm = (message, title = 'Confirm') => openDialog({ type: 'confirm', title, message }).then(res => !!res);
    const prompt = (message, defaultValue = '', title = 'Prompt') => openDialog({ type: 'prompt', title, message, defaultValue });

    return (
        <DialogContext.Provider value={{ alert, confirm, prompt }}>
            {children}
            <Modal
                isOpen={dialog.isOpen}
                type={dialog.type}
                title={dialog.title}
                message={dialog.message}
                inputProps={{
                    value: dialog.inputValue,
                    onChange: e => setDialog(prev => ({ ...prev, inputValue: e.target.value }))
                }}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirmText={dialog.type === 'alert' ? 'OK' : 'OK'}
                cancelText="Cancel"
            />
        </DialogContext.Provider>
    );
};

export const useDialog = () => useContext(DialogContext);
