import React from 'react';
import '../styles/variables.css';
import TransportBar from './TransportBar/TransportBar';
import Inspector from './Sidebar/Inspector';

import { useView } from '../contexts/ViewContext';
import NavigationTimeline from './Timeline/NavigationTimeline';

const MainLayout = ({ children }) => {
    const { scrollContainerRef } = useView();

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            width: '100vw',
            backgroundColor: 'var(--bg-app)'
        }}>
            <TransportBar />

            <div className="main-body" style={{
                flex: 1,
                display: 'flex',
                overflow: 'hidden'
            }}>
                <Inspector />

                <main className="timeline-area" style={{
                    flex: 1,
                    minWidth: 0,
                    backgroundColor: 'var(--bg-timeline)',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative'
                }}>
                    <div
                        className="tracks-container"
                        ref={scrollContainerRef}
                        style={{
                            flex: 1,
                            overflowX: 'auto',
                            overflowY: 'auto',
                            position: 'relative' // For Playhead absolute positioning context
                        }}
                    >
                        {children}
                    </div>

                    {/* Navigation Bar at Bottom */}
                    <div style={{ paddingLeft: 'var(--track-header-width)', backgroundColor: '#222' }}>
                        <NavigationTimeline />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
