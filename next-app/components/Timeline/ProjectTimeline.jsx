'use client';

import React from 'react';
import MainLayout from '../MainLayout';
import TrackLane from './TrackLane';
import TempoLane from './TempoLane';
import Waveform from './Waveform';
import TimelineRuler from './TimelineRuler';
import Playhead from './Playhead';
import { useProject } from '../../contexts/ProjectContext';

const ProjectTimeline = () => {
    const { tracks } = useProject();

    return (
        <MainLayout>
            <div style={{ position: 'relative', minWidth: '100%' }}>
                {/* Ruler Row */}
                <div style={{ display: 'flex' }}>
                    <div style={{
                        width: 'var(--track-header-width)',
                        minWidth: 'var(--track-header-width)',
                        position: 'sticky',
                        left: 0,
                        zIndex: 110,
                        backgroundColor: '#222',
                        borderRight: '1px solid #444',
                        borderBottom: '1px solid #444',
                        display: 'flex', alignItems: 'center', padding: '5px', fontSize: '12px', fontWeight: 'bold'
                    }}>
                        Timeline
                    </div>
                    <TimelineRuler />
                </div>

                {/* Playhead Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: 'var(--track-header-width)',
                    right: 0,
                    pointerEvents: 'none'
                }}>
                    <Playhead />
                </div>

                {/* Tracks */}
                {tracks.map(track => {
                    if (track.type === 'TEMPO') {
                        return (
                            <TempoLane key={track.id} />
                        );
                    }
                    if (track.type === 'AUDIO') {
                        return (
                            <TrackLane
                                key={track.id}
                                id={track.id}
                                title={track.title}
                                color={track.color}
                                height={track.height}
                            >
                                <Waveform
                                    src={track.src}
                                    sensitivity={track.transientSensitivity || 1.0}
                                    offset={track.offset || 0}
                                    syncPoint={track.syncPoint || null}
                                    trackId={track.id}
                                />
                            </TrackLane>
                        );
                    }
                    return null;
                })}
            </div>
        </MainLayout>
    );
};

export default ProjectTimeline;
