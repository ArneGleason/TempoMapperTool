import { useState } from 'react'
import MainLayout from './components/MainLayout'
import TrackLane from './components/Timeline/TrackLane'
import TempoLane from './components/Timeline/TempoLane'
import Waveform from './components/Timeline/Waveform'
import { PlayerProvider } from './contexts/PlayerContext'
import { ProjectProvider, useProject } from './contexts/ProjectContext'
import { ViewProvider } from './contexts/ViewContext'

import TimelineRuler from './components/Timeline/TimelineRuler'
import Playhead from './components/Timeline/Playhead'

const ProjectTimeline = () => {
  const { tracks } = useProject();

  return (
    <MainLayout>
      <div style={{ position: 'relative', minWidth: '100%' }}>
        {/* Ruler Header Offset - Ruler needs to also have the 'header width' offset? 
             Actually TimelineRuler is just the ticks. TrackLane has a header. 
             If we put TimelineRuler in the scroll container, it will start at X=0 (left edge of view).
             But TrackLanes have a sidebar header of ~200px.
             So Track content starts at 200px.
             We need to offset the Ruler and Playhead AND TrackContent to all align.
             
             Current TrackLane implementation: Flex row. Header (fixed width) | Content (flex 1).
             So the scroll container contains [Header | Content].
             If we scroll X, the Header moves away!
             
             Wait, I made the header sticky in previous step!
             So the scroll container X affects the whole row.
             
             If I put Ruler in the scroll container, it also needs a "Spacer" to match the track header width,
             OR it needs a sticky header too (e.g. "Time" label).
         */}

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

        {/* Playhead Overlay - Needs to overlay the CONTENT part, skipping the header width. 
             Or allow it to overlay everything but visually start after header. 
             Ideally Playhead Left = (currentTime * pps) + headerWidth
         */}
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
          // ... (keep existing)
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
                <Waveform src={track.src} sensitivity={track.transientSensitivity || 1.0} />
              </TrackLane>
            );
          }
          return null;
        })}
      </div>
    </MainLayout>
  );
};

function App() {
  return (
    <ProjectProvider>
      <PlayerProvider>
        <ViewProvider>
          <ProjectTimeline />
        </ViewProvider>
      </PlayerProvider>
    </ProjectProvider>
  )
}

export default App
