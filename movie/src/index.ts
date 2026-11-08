import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { total, Video } from './Video';

function Root() {
  return React.createElement(Composition, {
    id: 'Selfy',
    component: Video,
    durationInFrames: total,
    fps: 30,
    width: 1920,
    height: 1080,
  });
}

registerRoot(Root);
