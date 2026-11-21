import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface TitleOverlayProps {
  badge: string;
  title: string;
  subtitle: string;
  startFrame: number;
  durationFrames: number;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  badge,
  title,
  subtitle,
  startFrame,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const relFrame = frame - startFrame;

  if (relFrame < 0 || relFrame > durationFrames) {
    return null;
  }

  // Fade and slide in
  const opacity = interpolate(
    relFrame,
    [0, 15, durationFrames - 15, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    relFrame,
    [0, 15, durationFrames - 15, durationFrames],
    [20, 0, 0, -10],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: 60,
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(183, 243, 74, 0.15)',
          border: '1px solid #b7f34a',
          color: '#b7f34a',
          padding: '6px 14px',
          borderRadius: 9999,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 12,
          boxShadow: '0 0 20px rgba(183, 243, 74, 0.2)',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#b7f34a',
            display: 'inline-block',
          }}
        />
        {badge}
      </div>

      <div
        style={{
          background: 'rgba(10, 15, 20, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          padding: '20px 28px',
          maxWidth: 580,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 32,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: 17,
            color: '#94a3b8',
            lineHeight: 1.4,
            fontFamily: 'Inter, -apple-system, sans-serif',
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
};
