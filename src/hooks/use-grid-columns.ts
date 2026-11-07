import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";

const STORAGE_KEY = "selfy:grid-columns";
const MIN_COLUMNS = 1;
const MAX_COLUMNS = 7;
const DEFAULT_COLUMNS = 3;
// 指の間隔がこの比率だけ変わるたびに1列ずつ増減する
const STEP_RATIO = 1.3;
// ピンチを終えた指がそのままタップ扱いになり、写真が開くのを防ぐ
const CLICK_GUARD_MS = 400;

function readColumns() {
  try {
    const value = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value >= MIN_COLUMNS && value <= MAX_COLUMNS ? value : null;
  } catch {
    return null;
  }
}

function distance(touches: TouchList) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

// スマホで写真一覧をピンチして、1行の枚数を変える。PC は幅に合わせて自動で並べる
export function useGridColumns<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  const current = useRef(DEFAULT_COLUMNS);
  // 列数を変えても、指の間にあった写真が同じ位置に残るようにスクロールを合わせる
  const anchor = useRef<{ element: Element; top: number } | null>(null);

  // サーバーでは保存した値を読めないので、表示後に反映する
  useEffect(() => {
    const saved = readColumns();
    if (saved) {
      current.current = saved;
      setColumns(saved);
    }
  }, []);

  useLayoutEffect(() => {
    const saved = anchor.current;
    anchor.current = null;
    if (saved) window.scrollBy(0, saved.element.getBoundingClientRect().top - saved.top);
  }, [columns]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    let startDistance: number | null = null;
    let guardUntil = 0;

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length === 2 && mobile.matches) startDistance = distance(event.touches);
    }

    function onTouchMove(event: TouchEvent) {
      if (startDistance === null || event.touches.length !== 2) return;
      // ブラウザ自体の拡大を止める
      event.preventDefault();
      const ratio = distance(event.touches) / startDistance;
      if (ratio < STEP_RATIO && ratio > 1 / STEP_RATIO) return;
      startDistance = distance(event.touches);
      // 指を広げると大きく表示する、つまり列を減らす
      const next = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, current.current + (ratio > 1 ? -1 : 1)));
      if (next === current.current) return;

      const x = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const y = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      const target = document.elementFromPoint(x, y)?.closest("[data-photo-id]");
      anchor.current = target ? { element: target, top: target.getBoundingClientRect().top } : null;
      current.current = next;
      setColumns(next);
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // 保存できなくても、このページの中では列数を変えられる
      }
    }

    function onTouchEnd(event: TouchEvent) {
      if (startDistance !== null && event.touches.length < 2) {
        startDistance = null;
        guardUntil = Date.now() + CLICK_GUARD_MS;
      }
    }

    function onClick(event: MouseEvent) {
      if (Date.now() < guardUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    // iOS Safari は touchmove を止めてもページの拡大を始めることがある
    function onGesture(event: Event) {
      if (mobile.matches) event.preventDefault();
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    element.addEventListener("click", onClick, true);
    element.addEventListener("gesturestart", onGesture);
    return () => {
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("click", onClick, true);
      element.removeEventListener("gesturestart", onGesture);
    };
  }, []);

  return {
    ref,
    columns,
    style: { "--grid-columns": columns } as CSSProperties,
  };
}

// スマホのときだけ列数を CSS 変数から取る
export const MOBILE_COLUMNS_CLASS = "max-md:grid-cols-[repeat(var(--grid-columns),minmax(0,1fr))]";
