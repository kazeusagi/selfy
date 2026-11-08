import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Check, ChevronDown, ChevronLeft, Copy, Download, Folder, HardDrive, Image, KeyRound, Link, Mail, Monitor, MoreHorizontal, Share2, SquareCheck, Upload, UserRound } from 'lucide-react';
import { Avatar, Blue, Button, C, Caption, Caret, Cursor, Header, Logo, Modal, photo, typed } from './ui';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

// アプリ画面(1920x1080)をズーム表示するカメラ
function Camera({ z, cx, cy, children }: { z: number; cx: number; cy: number; children: React.ReactNode }) {
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          width: 1920,
          height: 1080,
          transformOrigin: '0 0',
          transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})`,
          background: C.bg,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
}

const glow = { background: 'radial-gradient(circle at 50% 40%, rgba(59,91,240,0.28), transparent 55%), #0b0b0d' };

// ---------- 1. イントロ ----------
export function Intro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12 } });
  const sub = spring({ frame: frame - 25, fps, config: { damping: 20 } });
  const photos = [0, 2, 5, 7, 9, 12];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', ...glow }}>
      {photos.map((p, i) => {
        const angle = (i / photos.length) * Math.PI * 2 + frame / 90;
        const r = 560;
        const ps = spring({ frame: frame - 5 - i * 3, fps, config: { damping: 15 } });
        return (
          <Img
            key={p}
            src={photo(p)}
            style={{
              position: 'absolute',
              width: 200,
              height: 200,
              objectFit: 'cover',
              borderRadius: 20,
              left: 960 - 100 + Math.cos(angle) * r * 1.15,
              top: 540 - 100 + Math.sin(angle) * r * 0.62,
              opacity: ps * 0.55,
              transform: `scale(${ps})`,
            }}
          />
        );
      })}
      <div style={{ transform: `scale(${s})` }}>
        <Logo size={120} text={110} />
      </div>
      <div style={{ marginTop: 36, fontSize: 52, fontWeight: 700, color: C.fg, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
        <Blue>Cloudflare R2</Blue> を、あなただけの写真ストレージに。
      </div>
    </AbsoluteFill>
  );
}

// ---------- 2. コンセプト ----------
export function Concept() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const gb = interpolate(frame, [10, 50], [0, 10], { ...clamp, easing: Easing.out(Easing.cubic) });
  const head = spring({ frame, fps, config: { damping: 18 } });
  const chips = ['自分だけのストレージ', '招待制で共有', 'OSS・セルフホスト'];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', ...glow }}>
      <div style={{ fontSize: 44, fontWeight: 700, color: C.muted, opacity: head }}>Cloudflare R2 の無料枠</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, marginTop: 10 }}>
        <span style={{ fontSize: 260, fontWeight: 800, color: C.fg, letterSpacing: -8, fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(gb)}
        </span>
        <span style={{ fontSize: 120, fontWeight: 800, color: C.fg }}>GB</span>
        <span
          style={{
            marginLeft: 16,
            fontSize: 64,
            fontWeight: 800,
            color: '#fff',
            background: C.primary,
            borderRadius: 24,
            padding: '6px 28px',
            transform: `scale(${spring({ frame: frame - 50, fps, config: { damping: 10 } })})`,
          }}
        >
          無料
        </span>
      </div>
      <div style={{ fontSize: 46, fontWeight: 700, color: C.fg, marginTop: 10, opacity: spring({ frame: frame - 65, fps }) }}>
        まるごと<Blue>あなた専用</Blue>の写真置き場に
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 60 }}>
        {chips.map((t, i) => {
          const cs = spring({ frame: frame - 90 - i * 8, fps, config: { damping: 15 } });
          return (
            <div
              key={t}
              style={{
                fontSize: 32,
                fontWeight: 600,
                color: C.fg,
                border: `1px solid ${C.input}`,
                background: C.card,
                borderRadius: 999,
                padding: '14px 32px',
                opacity: cs,
                transform: `translateY(${(1 - cs) * 30}px)`,
              }}
            >
              {t}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

// ---------- 3. ログイン ----------
const columns = [
  [{ p: 2, h: 370 }, { p: 13, h: 415 }, { p: 1, h: 300 }],
  [{ p: 5, h: 466 }, { p: 6, h: 420 }, { p: 10, h: 300 }],
  [{ p: 7, h: 380 }, { p: 8, h: 207 }, { p: 3, h: 300 }, { p: 11, h: 300 }],
];

export function Login() {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [20, 50], [1, 1.6], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cx = interpolate(frame, [20, 50], [960, 1448], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const cy = interpolate(frame, [20, 50], [540, 470], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const email = typed('hello@example.com', frame, 78, 2);
  const focused = frame >= 72;
  const sent = frame >= 134;
  return (
    <>
      <Camera z={z} cx={cx} cy={cy}>
        <div style={{ position: 'absolute', left: 10, top: 10, display: 'flex', gap: 10 }}>
          {columns.map((col, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10, transform: `translateY(${(i % 2 ? -1 : 1) * frame * 0.4 - 40}px)` }}>
              {col.map((c) => (
                <Img key={c.p} src={photo(c.p)} style={{ width: 312, height: c.h, objectFit: 'cover', borderRadius: 12 }} />
              ))}
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 1296, top: 256, width: 304, color: C.fg }}>
          <Logo size={29} text={18} />
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 22 }}>おかえりなさい</div>
          <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.7 }}>
            あなたの写真は、あなただけのストレージに保存されます。
          </div>
          <div style={{ marginTop: 22, height: 40, borderRadius: 8, background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, fontWeight: 700 }}>
            <KeyRound size={13} /> パスキーでログイン
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0', fontSize: 10, color: C.subtle }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            または
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700 }}>メールアドレス</div>
          <div
            style={{
              marginTop: 8,
              height: 38,
              borderRadius: 8,
              border: `1px solid ${focused ? '#7c93ff' : C.input}`,
              boxShadow: focused ? '0 0 0 3px rgba(124,147,255,0.25)' : undefined,
              background: C.card,
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              fontSize: 12,
              color: email ? C.fg : C.subtle,
            }}
          >
            {email || (focused ? '' : 'you@example.com')}
            <Caret show={focused && !sent} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <Button icon={<Mail size={13} />} pressed={frame >= 132 && frame < 138} style={{ flex: 1, justifyContent: 'center', borderRadius: 8, height: 38 }}>
              リンクを送る
            </Button>
            <Button icon={<KeyRound size={13} />} style={{ flex: 1, justifyContent: 'center', borderRadius: 8, height: 38 }}>
              コードを送る
            </Button>
          </div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 28 }}>
            {sent ? (
              <span style={{ color: '#7c93ff', fontWeight: 700 }}>✓ ログインリンクを送信しました</span>
            ) : (
              '共有リンクを受け取った方は、届いたリンクから直接開けます。'
            )}
          </div>
        </div>
        <Cursor
          path={[
            { f: 55, x: 1560, y: 680 },
            { f: 70, x: 1420, y: 556 },
            { f: 116, x: 1420, y: 556 },
            { f: 130, x: 1380, y: 602 },
          ]}
          clicks={[71, 131]}
        />
      </Camera>
      <Caption start={58} end={175}>
        メールアドレスかパスキーで<Blue>ログイン</Blue>
      </Caption>
    </>
  );
}

// ---------- アルバム画面の共通部品 ----------
function AlbumTop({ meta, children }: { meta: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', left: 474, top: 84, width: 972, color: C.fg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.muted }}>
        <ChevronLeft size={12} /> アルバム
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
        <div>
          <div style={{ fontSize: 27, fontWeight: 700 }}>さんぷる</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, height: 16 }}>{meta}</div>
        </div>
        <div style={{ display: 'flex', gap: 9 }}>{children}</div>
      </div>
    </div>
  );
}

function RoundIcon() {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${C.input}`, display: 'grid', placeItems: 'center' }}>
      <MoreHorizontal size={14} />
    </div>
  );
}

function PhotoGrid({ count, frame, at }: { count: number; frame: number; at: (i: number) => number }) {
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 474, top: 229, width: 972, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
      {Array.from({ length: count }, (_, i) => {
        const s = spring({ frame: frame - at(i), fps, config: { damping: 14 } });
        return (
          <Img
            key={i}
            src={photo(i)}
            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 3, opacity: s, transform: `scale(${0.8 + s * 0.2})` }}
          />
        );
      })}
    </div>
  );
}

// ---------- 4. アルバム作成 ----------
export function CreateAlbum() {
  const frame = useCurrentFrame();
  const name = typed('さんぷる', frame, 74, 5);
  const typing = frame >= 68;
  return (
    <>
      <Camera z={1.25} cx={960} cy={400}>
        <Header />
        <div style={{ position: 'absolute', left: 474, top: 92, width: 972, color: C.fg, display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 27, fontWeight: 700 }}>アルバム</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>0 アルバム · 0 枚 · 0 KB 使用中</div>
          </div>
          <div style={{ display: 'flex', gap: 4, background: C.card, borderRadius: 10, padding: 4, height: 28, marginTop: 22, fontSize: 11, fontWeight: 600, color: C.muted }}>
            <span style={{ background: C.secondary, color: C.fg, borderRadius: 7, padding: '6px 12px' }}>すべて</span>
            <span style={{ padding: '6px 12px' }}>自分のアルバム</span>
            <span style={{ padding: '6px 12px' }}>共有されたアルバム</span>
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 474,
            top: 172,
            width: 230,
            height: 173,
            border: `1px dashed ${frame > 38 ? C.muted : C.input}`,
            borderRadius: 12,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            color: C.muted,
            fontSize: 12,
          }}
        >
          <span style={{ fontSize: 24, fontWeight: 300 }}>+</span>新しいアルバム
        </div>
        <Modal start={46} width={360} top={366}>
          <div style={{ color: C.fg }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>新しいアルバム</div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 18 }}>アルバム名</div>
            <div
              style={{
                marginTop: 8,
                height: 36,
                borderRadius: 10,
                border: `1px solid ${typing ? '#7c93ff' : C.input}`,
                boxShadow: typing ? '0 0 0 3px rgba(124,147,255,0.25)' : undefined,
                background: C.card,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                fontSize: 12,
              }}
            >
              {name}
              <Caret show={typing && frame < 112} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
              <Button primary dim={!name} pressed={frame >= 112 && frame < 118}>作成</Button>
            </div>
          </div>
        </Modal>
        <Cursor
          path={[
            { f: 12, x: 900, y: 520 },
            { f: 36, x: 590, y: 262 },
            { f: 50, x: 590, y: 262 },
            { f: 64, x: 960, y: 466 },
            { f: 96, x: 960, y: 466 },
            { f: 110, x: 1094, y: 516 },
          ]}
          clicks={[38, 66, 112]}
        />
      </Camera>
      <Caption start={14} end={130}>
        アルバムを作って
      </Caption>
    </>
  );
}

// ---------- 5. 写真の追加 ----------
const UPLOAD = 128; // アップロード開始フレーム
const PER = 7; // 1枚あたりのフレーム数

function FileDialog({ start, end, frame }: { start: number; end: number; frame: number }) {
  const { fps } = useVideoConfig();
  if (frame < start || frame > end + 8) return null;
  const s = spring({ frame: frame - start, fps, config: { damping: 18, stiffness: 180 } });
  const out = interpolate(frame, [end, end + 8], [1, 0], clamp);
  const selected = (i: number) => (i === 0 && frame >= 52) || (frame >= 82 + i);
  const count = Array.from({ length: 14 }, (_, i) => i).filter(selected).length;
  const side = [
    { icon: <Monitor size={13} />, t: 'デスクトップ' },
    { icon: <Download size={13} />, t: 'ダウンロード' },
    { icon: <Image size={13} />, t: 'ピクチャ', active: true },
    { icon: <Folder size={13} />, t: 'ドキュメント' },
    { icon: <HardDrive size={13} />, t: 'ローカルディスク' },
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - 420,
        top: 210,
        width: 840,
        height: 470,
        background: '#202023',
        border: '1px solid #38383d',
        borderRadius: 12,
        overflow: 'hidden',
        color: C.fg,
        opacity: s * out,
        transform: `scale(${0.95 + s * 0.05})`,
        boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50,
      }}
    >
      <div style={{ height: 38, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 7, borderBottom: '1px solid #38383d', fontSize: 12, fontWeight: 600 }}>
        <span style={{ width: 11, height: 11, borderRadius: 99, background: '#ff5f57' }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: '#febc2e' }} />
        <span style={{ width: 11, height: 11, borderRadius: 99, background: '#28c840' }} />
        <span style={{ marginLeft: 12 }}>開く — ピクチャ</span>
      </div>
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ width: 150, borderRight: '1px solid #38383d', padding: 10, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {side.map((x) => (
            <div key={x.t} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 8px', borderRadius: 6, background: x.active ? '#33333a' : undefined, color: x.active ? C.fg : C.muted }}>
              {x.icon}
              {x.t}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10, alignContent: 'start' }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: 4, borderRadius: 6, background: selected(i) ? 'rgba(59,91,240,0.35)' : undefined }}>
              <div style={{ position: 'relative' }}>
                <Img src={photo(i)} style={{ width: 76, height: 76, objectFit: 'cover', borderRadius: 4, outline: selected(i) ? `2px solid ${C.primary}` : undefined }} />
                {selected(i) && (
                  <div style={{ position: 'absolute', right: 3, top: 3, width: 16, height: 16, borderRadius: 99, background: C.primary, display: 'grid', placeItems: 'center' }}>
                    <Check size={11} strokeWidth={3} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 9, color: C.muted }}>{`photo${String(i + 1).padStart(2, '0')}.jpg`}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 54, borderTop: '1px solid #38383d', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', fontSize: 11, color: C.muted }}>
        <span>{count > 0 ? `${count} 個の項目を選択` : '画像ファイル (*.jpg, *.png, *.heic)'}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button style={{ borderRadius: 8, height: 30 }}>キャンセル</Button>
          <Button primary dim={count === 0} pressed={frame >= 112 && frame < 118} style={{ borderRadius: 8, height: 30 }}>
            開く
          </Button>
        </div>
      </div>
    </div>
  );
}

function UploadToast({ frame }: { frame: number }) {
  const done = Math.min(14, Math.max(0, Math.floor((frame - UPLOAD) / PER)));
  const end = UPLOAD + 14 * PER + 30;
  if (frame < UPLOAD || frame > end + 10) return null;
  const opacity = interpolate(frame, [UPLOAD, UPLOAD + 6, end, end + 10], [0, 1, 1, 0], clamp);
  return (
    <div style={{ position: 'absolute', left: 1186, top: 640, width: 260, background: C.popover, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, opacity, color: C.fg }}>
      <div style={{ fontSize: 11, fontWeight: 700 }}>{done < 14 ? `${done} / 14 枚をアップロード中` : '✓ 14 枚をアップロードしました'}</div>
      <div style={{ height: 4, borderRadius: 99, background: C.secondary, marginTop: 10 }}>
        <div style={{ width: `${(done / 14) * 100}%`, height: '100%', borderRadius: 99, background: C.primary }} />
      </div>
    </div>
  );
}

export function AddPhotos() {
  const frame = useCurrentFrame();
  const at = (i: number) => UPLOAD + (i + 1) * PER;
  const count = Array.from({ length: 14 }, (_, i) => i).filter((i) => frame >= at(i)).length;
  return (
    <>
      <Camera z={1.25} cx={960} cy={400}>
        <Header placeholder="このアルバム内を検索" upload={false} />
        <AlbumTop meta={count === 14 ? '14 枚 · 2026年11月7日' : `${count} 枚`}>
          <Button icon={<Share2 size={13} />}>共有</Button>
          {count > 0 && <Button icon={<SquareCheck size={13} />}>選択</Button>}
          <Button primary icon={<Upload size={13} />} pressed={frame >= 32 && frame < 38} dim={frame >= 36 && count < 14}>
            写真を追加
          </Button>
          <RoundIcon />
        </AlbumTop>
        {count === 0 ? (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 252, textAlign: 'center', fontSize: 11, color: C.muted }}>
            まだ写真がありません。「写真を追加」から追加してください。
          </div>
        ) : (
          <div style={{ position: 'absolute', left: 474, top: 202, fontSize: 12, fontWeight: 700, color: C.fg }}>11月7日（土）</div>
        )}
        <PhotoGrid count={count} frame={frame} at={at} />
        <FileDialog start={36} end={118} frame={frame} />
        <UploadToast frame={frame} />
        <Cursor
          path={[
            { f: 10, x: 1100, y: 420 },
            { f: 30, x: 1352, y: 164 },
            { f: 40, x: 1352, y: 164 },
            { f: 50, x: 755, y: 300 },
            { f: 62, x: 755, y: 300 },
            { f: 80, x: 1302, y: 400 },
            { f: 96, x: 1302, y: 400 },
            { f: 110, x: 1350, y: 652 },
            { f: 130, x: 1350, y: 652 },
            { f: 150, x: 1250, y: 600 },
          ]}
          clicks={[32, 52, 82, 112]}
        />
      </Camera>
      <Caption start={40} end={122}>
        写真を<Blue>まとめて</Blue>選んで
      </Caption>
      <Caption start={130} end={290}>
        あなたの <Blue>Cloudflare R2</Blue> にアップロード
      </Caption>
    </>
  );
}

// ---------- 6. 共有 ----------
function Toggle({ on }: { on: number }) {
  return (
    <div style={{ width: 38, height: 22, borderRadius: 99, background: on > 0.5 ? C.primary : C.input, position: 'relative' }}>
      <div style={{ position: 'absolute', top: 3, left: 3 + on * 16, width: 16, height: 16, borderRadius: 99, background: '#fff' }} />
    </div>
  );
}

function Select({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ height: 34, borderRadius: 8, border: `1px solid ${C.input}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', fontSize: 11, ...style }}>
      {children}
      <ChevronDown size={12} />
    </div>
  );
}

export function Share() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const on = spring({ frame: frame - 112, fps, config: { damping: 20 } });
  const linked = frame >= 112;
  const url = typed('https://selfy.kazeusagi.dev/s/sXS1kRk1BnSQza7O3KjJvw', frame, 120, 1);
  const copied = frame >= 182;
  const highlight = interpolate(frame, [50, 58, 100, 108], [0, 1, 1, 0], clamp);
  return (
    <>
      <Camera z={1.25} cx={960} cy={420}>
        <Header placeholder="このアルバム内を検索" upload={false} />
        <AlbumTop
          meta={
            <>
              14 枚 · 2026年11月7日
              {linked && (
                <>
                  <span style={{ marginLeft: 6 }}><Avatar size={16} /></span> リンクで共有中
                </>
              )}
            </>
          }
        >
          <Button icon={<Share2 size={13} />} pressed={frame >= 32 && frame < 38}>共有</Button>
          <Button icon={<SquareCheck size={13} />}>選択</Button>
          <Button primary icon={<Upload size={13} />}>写真を追加</Button>
          <RoundIcon />
        </AlbumTop>
        <div style={{ position: 'absolute', left: 474, top: 202, fontSize: 12, fontWeight: 700, color: C.fg }}>11月7日（土）</div>
        <PhotoGrid count={14} frame={frame} at={() => -30} />
        <Modal start={36} width={430} top={300 - on * 52}>
          <div style={{ color: C.fg }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>「さんぷる」を共有</div>
            <div style={{ fontSize: 10.5, color: C.muted, marginTop: 6 }}>メンバーを招待するか、閲覧用のリンクを発行できます。</div>
            <div
              style={{
                display: 'flex',
                gap: 7,
                marginTop: 18,
                padding: 4,
                margin: '14px -4px 0',
                borderRadius: 12,
                outline: `2px solid rgba(124,147,255,${highlight})`,
              }}
            >
              <Select style={{ flex: 1, color: C.muted }}>
                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <UserRound size={12} />招待する人を選択
                </span>
              </Select>
              <Select style={{ width: 84, fontWeight: 700, gap: 4, whiteSpace: 'nowrap' }}>閲覧のみ</Select>
              <Button primary dim style={{ borderRadius: 8 }}>招待</Button>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 20 }}>メンバー</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
              <Avatar size={30} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>あなた</div>
                <div style={{ fontSize: 9.5, color: C.muted }}>hello@example.com</div>
              </div>
              <span style={{ fontSize: 10, color: C.muted }}>オーナー</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: 99, background: C.secondary, display: 'grid', placeItems: 'center' }}>
                <Link size={13} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>リンクで共有</div>
                <div style={{ fontSize: 9.5, color: C.muted }}>
                  {linked ? 'リンクを知っている人は誰でも閲覧できます' : 'オフ — 招待したメンバーだけが閲覧できます'}
                </div>
              </div>
              <Toggle on={on} />
            </div>
            <div style={{ height: on * 104, overflow: 'hidden', opacity: on }}>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <div style={{ flex: 1, height: 34, borderRadius: 8, border: `1px solid ${C.input}`, background: C.card, display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: 10.5, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {url}
                </div>
                <Button icon={copied ? <Check size={12} /> : <Copy size={12} />} pressed={frame >= 182 && frame < 188} style={{ borderRadius: 8, width: 96, flexShrink: 0, justifyContent: 'center' }}>
                  {copied ? 'コピー済み' : 'コピー'}
                </Button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 9.5, color: C.muted }}>
                <div style={{ flex: 1 }}>
                  有効期限（2026年11月14日まで）
                  <Select style={{ marginTop: 6, color: C.fg, fontWeight: 700 }}>7日間</Select>
                </div>
                <div style={{ flex: 1 }}>
                  ダウンロード
                  <Select style={{ marginTop: 6, color: C.fg, fontWeight: 700 }}>閲覧のみ（保存不可）</Select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ background: '#fff', color: '#111', borderRadius: 999, padding: '9px 20px', fontSize: 11, fontWeight: 700 }}>完了</div>
            </div>
          </div>
        </Modal>
        <Cursor
          path={[
            { f: 8, x: 1000, y: 420 },
            { f: 30, x: 1170, y: 164 },
            { f: 44, x: 1170, y: 164 },
            { f: 62, x: 880, y: 395 },
            { f: 94, x: 880, y: 395 },
            { f: 110, x: 1136, y: 534 },
            { f: 160, x: 1136, y: 480 },
            { f: 180, x: 1126, y: 526 },
          ]}
          clicks={[32, 112, 182]}
        />
      </Camera>
      <Caption start={46} end={110}>
        <Blue>招待した人だけ</Blue>があなたの Selfy に参加
      </Caption>
      <Caption start={122} end={255}>
        期限つきの<Blue>閲覧リンク</Blue>も発行できる
      </Caption>
    </>
  );
}

// ---------- 7. アウトロ ----------
export function Outro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const head = spring({ frame, fps, config: { damping: 18 } });
  const cmd = typed('git clone https://github.com/kazeusagi/selfy', frame, 24, 1);
  const tail = spring({ frame: frame - 80, fps, config: { damping: 18 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', ...glow }}>
      <div style={{ opacity: head, transform: `translateY(${(1 - head) * 20}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Logo size={72} text={64} />
        <div style={{ fontSize: 54, fontWeight: 700, color: C.fg, marginTop: 30 }}>
          クローンして、<Blue>セルフホスト</Blue>。
        </div>
      </div>
      <div style={{ marginTop: 50, width: 1100, background: '#151518', border: `1px solid ${C.border}`, borderRadius: 18, overflow: 'hidden', opacity: head }}>
        <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 9, padding: '0 18px', borderBottom: `1px solid ${C.border}` }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <span key={c} style={{ width: 13, height: 13, borderRadius: 99, background: c }} />
          ))}
        </div>
        <div style={{ padding: '30px 34px', fontFamily: 'monospace', fontSize: 34, color: C.fg }}>
          <span style={{ color: '#28c840' }}>$ </span>
          {cmd}
          <Caret />
        </div>
      </div>
      <div style={{ marginTop: 44, display: 'flex', gap: 18, alignItems: 'center', opacity: tail, transform: `translateY(${(1 - tail) * 20}px)` }}>
        <span style={{ fontSize: 40, fontWeight: 700, color: C.fg }}>github.com/kazeusagi/selfy</span>
        <span style={{ fontSize: 26, fontWeight: 600, color: C.muted, border: `1px solid ${C.input}`, borderRadius: 999, padding: '8px 22px' }}>
          OSS · MIT License
        </span>
      </div>
    </AbsoluteFill>
  );
}
