import React from 'react';
import {
  AbsoluteFill,
  OffthreadVideo,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { MainFlowOverlay } from './components/MainFlowOverlay';
import { OutroCard } from './components/OutroCard';

export const MainFlowDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const outroStart = 1860;

  // Zoom: The camera stays at 1.0x (full clean context).
  // SUTTLE 1.12x punch-ins ONLY on:
  // - Scene 2: Medical Sheet & Injuries Card (frames 540 to 750)
  // - Scene 3: Weekly routine arrangement (frames 930 to 1110)
  const scale = interpolate(
    frame,
    [0, 510, 560, 740, 780, 900, 940, 1100, 1140, outroStart],
    [1.0, 1.0, 1.12, 1.12, 1.0, 1.0, 1.10, 1.10, 1.0, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, 510, 560, 740, 780, 900, 940, 1100, 1140, outroStart],
    [0, 0, -45, -45, 0, 0, -35, -35, 0, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0e14', overflow: 'hidden' }}>
      {/* Real Application Capture */}
      <div
        style={{
          width: '100%',
          height: '100%',
          transform: `scale(${scale}) translateY(${translateY}px)`,
          transformOrigin: '50% 50%',
        }}
      >
        <OffthreadVideo
          src={staticFile('raw_main_flow.webm')}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Subtle vignette for high-end SaaS feel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
          pointerEvents: 'none',
        }}
      />

      {/* Scene 1: Athlete Connection Token */}
      <MainFlowOverlay
        badge="01 / ONBOARDING"
        title="Instant Athlete Connection"
        subtitle="Athletes generate a secure 1-click token to link seamlessly with their coach."
        startFrame={30}
        durationFrames={320}
      />

      {/* Scene 2: Coach Reviewing Medical Sheet & Injuries */}
      <MainFlowOverlay
        badge="02 / ATHLETE INTELLIGENCE"
        title="Medical & Injury Prevention"
        subtitle="Review active injuries, medical restrictions, and target goals before assigning volume."
        startFrame={390}
        durationFrames={380}
      />

      {/* Scene 3: Coach Routine Planning */}
      <MainFlowOverlay
        badge="03 / ROUTINE BUILDER"
        title="Drag & Drop Weekly Scheduling"
        subtitle="Effortlessly arrange and balance training blocks across days with instant validation."
        startFrame={810}
        durationFrames={320}
      />

      {/* Scene 4: Student Live Workout Execution */}
      <MainFlowOverlay
        badge="04 / LIVE LOGGING"
        title="Real-Time Set & Weight Tracking"
        subtitle="Clean, distraction-free interface for gym athletes to track sets, reps, and RPE."
        startFrame={1170}
        durationFrames={320}
      />

      {/* Scene 5: Mutual Progress Tracking */}
      <MainFlowOverlay
        badge="05 / MUTUAL SYNCHRONIZATION"
        title="Transparent Progress & PR Milestones"
        subtitle="Coaches and athletes stay aligned with real-time session logs and personal records."
        startFrame={1530}
        durationFrames={310}
      />

      {/* Outro Brand Card */}
      <OutroCard startFrame={outroStart} durationFrames={140} />
    </AbsoluteFill>
  );
};
