import React from 'react';
import { AbsoluteFill, OffthreadVideo, staticFile } from 'remotion';
import { FeatureOverlay } from './components/FeatureOverlay';

export const FeatureNotesDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0e14', overflow: 'hidden' }}>
      <OffthreadVideo
        src={staticFile('raw_feat_notes.webm')}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 90px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      />
      <FeatureOverlay
        category="ATHLETE FEEDBACK"
        title="Live Workout Notes & Discomforts"
        description="Athletes report real-time exercise feedback, RPE, or joint discomforts directly during training."
      />
    </AbsoluteFill>
  );
};
