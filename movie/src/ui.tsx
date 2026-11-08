import React from 'react';
import { Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Search, Upload } from 'lucide-react';

export const C = {
  bg: '#0f0f10',
  card: '#1a1a1c',
  popover: '#1c1c1f',
  primary: '#3b5bf0',
  fg: '#f4f4f5',
  muted: '#a1a1aa',
  subtle: '#8b8b94',
  secondary: '#232326',
  border: '#2a2a2e',
  input: '#3a3a3f',
  avatar: '#3a342c',
};

export const FONT = "'Inter Variable', 'Noto Sans CJK JP', sans-serif";

export const photo = (i: number) => staticFile(`photos/photo${String(i + 1).padStart(2, '0')}.jpg`);

// 指定フレームから文字を1つずつ表示
export function typed(text: string, frame: number, start: number, speed = 3) {
  const n = Math.max(0, Math.floor((frame - start) / speed));
  return Array.from(text).slice(0, n).join('');
}

export function Caret({ show = true }: { show?: boolean }) {
  const frame = useCurrentFrame();
  if (!show) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 1.5,
        height: '1.1em',
        marginLeft: 1,
        verticalAlign: 'text-bottom',
        background: C.fg,
        opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
      }}
    />
  );
}

export function Logo({ size = 24, text = 17 }: { size?: number; text?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.32 }}>
      <Img src={staticFile('favicon.svg')} style={{ width: size, height: size }} />
      <span style={{ fontSize: text, fontWeight: 700, color: C.fg, letterSpacing: -0.3 }}>Selfy</span>
    </div>
  );
}

export function Header({ placeholder = 'アルバムや写真を検索', upload = true }: { placeholder?: string; upload?: boolean }) {
  return (
    <div style={{ height: 58, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 972, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo />
          <div style={{ display: 'flex', gap: 4, fontSize: 12, fontWeight: 600 }}>
            <span style={{ background: C.secondary, borderRadius: 999, padding: '7px 12px', color: C.fg }}>アルバム</span>
            <span style={{ padding: '7px 12px', color: C.muted }}>お気に入り</span>
          </div>
        </div>
        <div
          style={{
            width: 384,
            height: 34,
            borderRadius: 999,
            border: `1px solid ${C.input}`,
            background: C.card,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '0 12px',
            color: C.subtle,
            fontSize: 12,
          }}
        >
          <Search size={14} />
          {placeholder}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {upload && <Button primary icon={<Upload size={13} />}>アップロード</Button>}
          <Avatar />
        </div>
      </div>
    </div>
  );
}

export function Avatar({ size = 34 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        background: C.avatar,
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: C.fg,
      }}
    >
      A
    </div>
  );
}

export function Button(props: { children?: React.ReactNode; primary?: boolean; icon?: React.ReactNode; dim?: boolean; pressed?: boolean; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        height: 34,
        padding: '0 15px',
        borderRadius: 999,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: '#fff',
        background: props.primary ? C.primary : 'transparent',
        border: props.primary ? 'none' : `1px solid ${C.input}`,
        opacity: props.dim ? 0.5 : 1,
        transform: props.pressed ? 'scale(0.95)' : undefined,
        ...props.style,
      }}
    >
      {props.icon}
      {props.children}
    </div>
  );
}

export function Overlay({ opacity }: { opacity: number }) {
  return <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', opacity }} />;
}

// 開くアニメーション付きモーダル
export function Modal({ start, width, top, children }: { start: number; width: number; top: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 180 } });
  return (
    <>
      <Overlay opacity={Math.min(1, s * 1.5)} />
      <div
        style={{
          position: 'absolute',
          left: 960 - width / 2,
          top,
          width,
          background: C.popover,
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          padding: 20,
          opacity: s,
          transform: `scale(${0.94 + s * 0.06}) translateY(${(1 - s) * 12}px)`,
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        {children}
      </div>
    </>
  );
}

type Point = { f: number; x: number; y: number };

// キーフレーム間を移動するマウスカーソル
export function Cursor({ path, clicks = [] }: { path: Point[]; clicks?: number[] }) {
  const frame = useCurrentFrame();
  const frames = path.map((p) => p.f);
  const ease = { easing: Easing.inOut(Easing.cubic), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
  const x = interpolate(frame, frames, path.map((p) => p.x), ease);
  const y = interpolate(frame, frames, path.map((p) => p.y), ease);
  const click = clicks.find((c) => frame >= c && frame < c + 14);
  const t = click === undefined ? 1 : (frame - click) / 14;
  const press = click === undefined ? 1 : interpolate(t, [0, 0.3, 1], [1, 0.8, 1]);
  const opacity = interpolate(frame, [frames[0], frames[0] + 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: x, top: y, opacity, zIndex: 100 }}>
      {click !== undefined && (
        <div
          style={{
            position: 'absolute',
            left: -24 * t,
            top: -24 * t,
            width: 48 * t,
            height: 48 * t,
            borderRadius: 999,
            border: '2px solid rgba(255,255,255,0.8)',
            opacity: 1 - t,
          }}
        />
      )}
      <svg width="22" height="26" viewBox="0 0 22 26" style={{ transform: `scale(${press})`, transformOrigin: '0 0', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
        <path d="M2 2 L2 21 L7 16.5 L10.5 24 L14 22.5 L10.5 15 L17.5 15 Z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// 下部に出る説明テキスト
export function Caption({ start, end, children }: { start: number; end: number; children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < start || frame > end) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 20 } });
  const out = interpolate(frame, [end - 8, end], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 64, display: 'flex', justifyContent: 'center', zIndex: 200 }}>
      <div
        style={{
          background: 'rgba(20,20,24,0.88)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(12px)',
          borderRadius: 999,
          padding: '18px 40px',
          fontSize: 40,
          fontWeight: 700,
          color: C.fg,
          opacity: s * out,
          transform: `translateY(${(1 - s) * 24}px)`,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export const Blue = ({ children }: { children: React.ReactNode }) => <span style={{ color: '#7c93ff' }}>{children}</span>;
