import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { TitleOverlay } from './components/TitleOverlay';
import { OutroCard } from './components/OutroCard';

export const SampleDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dynamic Camera Zoom & Pan Calculation
  // 0 - 60: Gentle zoom in on coach view
  // 60 - 180: Zoomed into coach weekly routine planner (scale 1.22)
  // 180 - 220: Smooth transition out to student view
  // 220 - 360: Zoomed into student workout execution (scale 1.18)
  // 360 - 450: Outro Card
  const scale = interpolate(
    frame,
    [0, 50, 180, 220, 260, 360],
    [1.0, 1.22, 1.22, 1.0, 1.18, 1.18],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, 50, 180, 220, 260, 360],
    [0, -60, -60, 0, -50, -50],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0e14', overflow: 'hidden' }}>
      {/* Real Application Video with Dynamic Camera Motion */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: '50% 50%',
          transition: 'transform 0.1s ease-out',
        }}
      >
        <OffthreadVideo
          src={staticFile('raw.webm')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Subtle vignette border to give premium SaaS look */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
        }}
      />

      {/* Title Overlay 1: Coach Scene */}
      <TitleOverlay
        badge="COACH WORKSPACE"
        title="Smart Weekly Routine Planner"
        subtitle="Effortlessly arrange, swap, and assign training blocks in seconds."
        startFrame={15}
        durationFrames={160}
      />

      {/* Title Overlay 2: Student Scene */}
      <TitleOverlay
        badge="ATHLETE EXPERIENCE"
        title="Frictionless Daily Execution"
        subtitle="Clean, responsive interface for tracking sets, weights, and routine adjustments."
        startFrame={220}
        durationFrames={135}
      />

      {/* Outro Brand Card */}
      <OutroCard startFrame={360} durationFrames={90} />
    </AbsoluteFill>
  );
};
