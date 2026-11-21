import React from 'react';
import { Composition } from 'remotion';
import { FullFlowDemo } from './FullFlowDemo';
import { MainFlowDemo } from './MainFlowDemo';
import { SampleDemo } from './SampleDemo';
import { FeatureWeightDemo } from './FeatureWeightDemo';
import { FeatureExerciseDemo } from './FeatureExerciseDemo';
import { FeatureRoutineDemo } from './FeatureRoutineDemo';
import { FeatureNotesDemo } from './FeatureNotesDemo';
import { FeatureLimitsDemo } from './FeatureLimitsDemo';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="FullFlowDemo"
        component={FullFlowDemo}
        durationInFrames={3020} // ~100.6 seconds at 30 fps (well within 2 min limit)
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureWeight"
        component={FeatureWeightDemo}
        durationInFrames={580} // 19.3 seconds
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureExercise"
        component={FeatureExerciseDemo}
        durationInFrames={616} // 20.5 seconds
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureRoutine"
        component={FeatureRoutineDemo}
        durationInFrames={724} // 24.1 seconds
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureNotes"
        component={FeatureNotesDemo}
        durationInFrames={337} // 11.2 seconds
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="FeatureLimits"
        component={FeatureLimitsDemo}
        durationInFrames={540} // 18.0 seconds
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="MainFlowDemo"
        component={MainFlowDemo}
        durationInFrames={2000} // ~66.7 seconds at 30 fps
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="SampleDemo"
        component={SampleDemo}
        durationInFrames={450}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
