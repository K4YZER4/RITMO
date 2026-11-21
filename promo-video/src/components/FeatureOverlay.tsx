import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface FeatureOverlayProps {
  category: string;
  title: string;
  description: string;
  durationFrames?: number;
}

export const FeatureOverlay: React.FC<FeatureOverlayProps> = ({
  category,
  title,
  description,
  durationFrames: customDuration,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: configDuration } = useVideoConfig();
  const durationFrames = customDuration || configDuration;

  const opacity = interpolate(
    frame,
    [0, 15, durationFrames - 15, durationFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(
    frame,
    [0, 18, durationFrames - 15, durationFrames],
    [20, 0, 0, -10],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 45,
        left: 45,
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 50,
        pointerEvents: 'none',
        fontFamily: 'Inter, -apple-system, sans-serif',
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
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 10,
          boxShadow: '0 0 16px rgba(183, 243, 74, 0.25)',
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: '#b7f34a',
            display: 'inline-block',
          }}
        />
        {category}
      </div>

      <div
        style={{
          background: 'rgba(10, 14, 20, 0.90)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 14,
          padding: '18px 24px',
          maxWidth: 540,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.7)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: '6px 0 0 0',
            fontSize: 15,
            color: '#94a3b8',
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
