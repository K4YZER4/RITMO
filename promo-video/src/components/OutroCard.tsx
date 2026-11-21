import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface OutroCardProps {
  startFrame: number;
  durationFrames: number;
}

export const OutroCard: React.FC<OutroCardProps> = ({
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  if (relFrame < 0) {
    return null;
  }

  const opacity = interpolate(
    relFrame,
    [0, 15],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(
    relFrame,
    [0, 20],
    [0.92, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: '#0a0e14',
        opacity,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        fontFamily: 'Inter, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Glow behind brand */}
        <div
          style={{
            position: 'absolute',
            width: 400,
            height: 400,
            background: 'radial-gradient(circle, rgba(183, 243, 74, 0.18) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: 'rgba(183, 243, 74, 0.12)',
            border: '1px solid rgba(183, 243, 74, 0.4)',
            color: '#b7f34a',
            padding: '8px 20px',
            borderRadius: 9999,
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 24,
          }}
        >
          High-Performance Fitness SaaS
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: '-0.04em',
            color: '#ffffff',
            lineHeight: 1,
            textShadow: '0 0 40px rgba(183, 243, 74, 0.3)',
          }}
        >
          RITMO<span style={{ color: '#b7f34a' }}>.</span>
        </h1>

        <p
          style={{
            margin: '20px 0 36px 0',
            fontSize: 26,
            color: '#94a3b8',
            maxWidth: 620,
            lineHeight: 1.4,
          }}
        >
          Elevate your coaching workflow. Plan smarter routines, track real progress, scale your athletes.
        </p>

        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: '#b7f34a',
            color: '#0a0e14',
            padding: '16px 40px',
            borderRadius: 14,
            fontSize: 20,
            fontWeight: 800,
            boxShadow: '0 12px 30px rgba(183, 243, 74, 0.35)',
          }}
        >
          <span>Start Free Today</span>
          <span style={{ fontSize: 24 }}>→</span>
        </div>
      </div>
    </div>
  );
};
