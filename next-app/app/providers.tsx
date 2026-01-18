'use client';

import React from 'react';
import { ProjectProvider } from '../contexts/ProjectContext';
import { PlayerProvider } from '../contexts/PlayerContext';
import { ViewProvider } from '../contexts/ViewContext';
import { DialogProvider } from '../contexts/DialogContext';

export function ClientProviders({ children }) {
    return (
        <ProjectProvider>
            <PlayerProvider>
                <ViewProvider>
                    <DialogProvider>
                        {children}
                    </DialogProvider>
                </ViewProvider>
            </PlayerProvider>
        </ProjectProvider>
    );
}
