import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export const ProjectProvider = ({ children }) => {
    // Tracks: { id, title, type: 'AUDIO' | 'TEMPO', color, src? }
    const [tracks, setTracks] = useState([
        { id: 'tempo-main', title: 'Tempo Map', type: 'TEMPO', color: '#00befc', height: '150px' }
    ]);

    const addAudioTrack = (file) => {
        const url = URL.createObjectURL(file);
        const newTrack = {
            id: `audio-${Date.now()}`,
            title: file.name,
            type: 'AUDIO',
            color: '#e8c64d',
            height: '130px',
            src: url
        };
        setTracks(prev => [...prev, newTrack]);
    };

    return (
        <ProjectContext.Provider value={{ tracks, setTracks, addAudioTrack }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => useContext(ProjectContext);
