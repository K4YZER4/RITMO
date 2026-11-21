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

export const FullFlowDemo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Raw capture duration: 96.28s * 30 fps = ~2888 frames
  const rawVideoEnd = 2888;
  const outroStart = 2888;

  // Minimal and subtle camera dynamics:
  // Strictly 1.0x (full clean view) throughout the entire video.
  // Subtle 1.08x punch-in ONLY on:
  // 1. Scene 3: Medical Sheet & Injury notes (frames 1050 to 1350)
  // 2. Scene 4: Weekly Routine Planner (frames 1550 to 1850)
  const scale = interpolate(
    frame,
    [
      0,
      1040, 1080, 1320, 1360,
      1540, 1580, 1820, 1860,
      rawVideoEnd,
    ],
    [
      1.0,
      1.0, 1.08, 1.08, 1.0,
      1.0, 1.08, 1.08, 1.0,
      1.0,
    ],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [
      0,
      1040, 1080, 1320, 1360,
      1540, 1580, 1820, 1860,
      rawVideoEnd,
    ],
    [
      0,
      0, -32, -32, 0,
      0, -28, -28, 0,
      0,
    ],
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
          src={staticFile('raw_full_flow.webm')}
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
          boxShadow: 'inset 0 0 90px rgba(0,0,0,0.45)',
          pointerEvents: 'none',
        }}
      />

      {/* Scene 1: Athlete Connection Token */}
      <MainFlowOverlay
        badge="01 / ONBOARDING"
        title="Instant Athlete Linking"
        subtitle="Athletes generate a secure single-use token to seamlessly connect with their coach."
        startFrame={30}
        durationFrames={380}
      />

      {/* Scene 2: Coach Consuming Token via Real API */}
      <MainFlowOverlay
        badge="02 / COACH WORKSPACE"
        title="Frictionless Roster Management"
        subtitle="Coaches claim the token with real-time API verification and instant roster onboarding."
        startFrame={490}
        durationFrames={420}
      />

      {/* Scene 3: Coach Reviewing Medical Sheet & Injuries */}
      <MainFlowOverlay
        badge="03 / ATHLETE INTELLIGENCE"
        title="Medical & Injury Prevention"
        subtitle="Review active injuries, joint limitations, and past history before assigning volume."
        startFrame={1000}
        durationFrames={420}
      />

      {/* Scene 4: Weekly Routine Scheduling */}
      <MainFlowOverlay
        badge="04 / ROUTINE BUILDER"
        title="Weekly Routine Programming"
        subtitle="Assign Torso and Pierna training blocks across days with instant calendar validation."
        startFrame={1470}
        durationFrames={660}
      />

      {/* Scene 5: Student Live Workout Execution */}
      <MainFlowOverlay
        badge="05 / LIVE LOGGING"
        title="Real-Time Workout Execution"
        subtitle="Athletes track sets and reps with clear feedback, pushing live data directly to the database."
        startFrame={2210}
        durationFrames={420}
      />

      {/* Scene 6: Mutual Progress Tracking */}
      <MainFlowOverlay
        badge="06 / SYNCHRONIZATION"
        title="Synchronized Progress History"
        subtitle="Finished sessions immediately reflect in the athlete's training log and coach dashboard."
        startFrame={2680}
        durationFrames={200}
      />

      {/* Outro Brand Card with CTA */}
      <OutroCard startFrame={outroStart} durationFrames={132} />
    </AbsoluteFill>
  );
};
