import React from 'react';
import { AbsoluteFill, interpolate, Series, useCurrentFrame, useVideoConfig } from 'remotion';
import '@fontsource-variable/inter';
import { AddPhotos, Concept, CreateAlbum, Intro, Login, Outro, Share } from './scenes';
import { FONT } from './ui';

export const scenes = [
  { C: Intro, d: 120 },
  { C: Concept, d: 180 },
  { C: Login, d: 180 },
  { C: CreateAlbum, d: 140 },
  { C: AddPhotos, d: 300 },
  { C: Share, d: 270 },
  { C: Outro, d: 200 },
];

export const total = scenes.reduce((sum, s) => sum + s.d, 0);

function Fade({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [0, 8, durationInFrames - 8, durationInFrames], [0, 1, 1, 0]);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

export function Video() {
  return (
    <AbsoluteFill style={{ background: '#0b0b0d', fontFamily: FONT }}>
      <Series>
        {scenes.map(({ C, d }, i) => (
          <Series.Sequence key={i} durationInFrames={d}>
            <Fade>
              <C />
            </Fade>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}
