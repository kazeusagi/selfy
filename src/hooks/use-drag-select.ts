import { type RefObject, useEffect, useRef } from "react";

const LONG_PRESS_MS = 450;
const LONG_PRESS_SLOP = 10;
// 指が画面の端に来たら、その先の写真も選べるようにスクロールする
const SCROLL_EDGE_TOP = 120;
const SCROLL_EDGE_BOTTOM = 180;
const SCROLL_MAX_SPEED = 14;
// 横の動きが縦のこの倍を超えたら、スクロールではなく範囲選択とみなす
const SWIPE_RATIO = 1.5;

type Selectable = { id: string };

function photoIdAt(x: number, y: number) {
  return document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-photo-id]")?.dataset.photoId;
}

// 長押しで選択を始め、指を離さずに動かすと長押しした写真からの範囲をまとめて選ぶ。
// 選択中は、写真の上で横に指を動かすだけでも範囲選択を始める。縦に動かしたときはスクロールになる。
// 始めた写真が選択済みなら、範囲を選択から外す
export function useDragSelect<T extends Selectable>(
  ref: RefObject<HTMLElement | null>,
  photos: T[],
  selectedIds: ReadonlySet<string> | undefined,
  onSelect: ((photos: T[], selected: boolean) => void) | undefined,
  selecting = false,
) {
  const latest = useRef({ photos, selectedIds, onSelect, selecting });
  latest.current = { photos, selectedIds, onSelect, selecting };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let start: { x: number; y: number } | null = null;
    let drag: {
      anchor: number;
      selected: boolean;
      // 始める前の状態。範囲を縮めたときはこの状態に戻す
      before: ReadonlySet<string>;
      range: Set<string>;
      x: number;
      y: number;
    } | null = null;
    let frame = 0;
    // 長押しのあとに来るクリックで、写真が開いたり選択が戻ったりしないようにする
    let swallowClick = false;

    function cancelPress() {
      if (timer) clearTimeout(timer);
      timer = null;
      start = null;
    }

    function stopDrag() {
      drag = null;
      cancelAnimationFrame(frame);
    }

    function extendTo(x: number, y: number) {
      const { photos, onSelect } = latest.current;
      const id = photoIdAt(x, y);
      if (!drag || !onSelect || !id) return;
      const index = photos.findIndex((photo) => photo.id === id);
      if (index < 0) return;
      const [from, to] = index < drag.anchor ? [index, drag.anchor] : [drag.anchor, index];
      const next = new Set(photos.slice(from, to + 1).map((photo) => photo.id));
      const added = photos.filter((photo) => next.has(photo.id) && !drag!.range.has(photo.id));
      const removed = photos.filter((photo) => drag!.range.has(photo.id) && !next.has(photo.id));
      if (added.length) onSelect(added, drag.selected);
      const restoreOn = removed.filter((photo) => drag!.before.has(photo.id));
      const restoreOff = removed.filter((photo) => !drag!.before.has(photo.id));
      if (restoreOn.length) onSelect(restoreOn, true);
      if (restoreOff.length) onSelect(restoreOff, false);
      drag.range = next;
    }

    function autoScroll() {
      if (!drag) return;
      const bottom = window.innerHeight - SCROLL_EDGE_BOTTOM;
      let speed = 0;
      if (drag.y < SCROLL_EDGE_TOP) speed = -((SCROLL_EDGE_TOP - drag.y) / SCROLL_EDGE_TOP) * SCROLL_MAX_SPEED;
      else if (drag.y > bottom) speed = Math.min(1, (drag.y - bottom) / SCROLL_EDGE_BOTTOM) * SCROLL_MAX_SPEED;
      if (speed) {
        window.scrollBy(0, speed);
        extendTo(drag.x, drag.y);
      }
      frame = requestAnimationFrame(autoScroll);
    }

    function onTouchStart(event: TouchEvent) {
      swallowClick = false;
      cancelPress();
      if (event.touches.length !== 1) {
        stopDrag();
        return;
      }
      if (!latest.current.onSelect || !(event.target as Element).closest("[data-photo-id]")) return;
      const touch = event.touches[0];
      start = { x: touch.clientX, y: touch.clientY };
      timer = setTimeout(() => {
        timer = null;
        beginDrag();
      }, LONG_PRESS_MS);
    }

    function beginDrag() {
      const { photos, selectedIds, onSelect } = latest.current;
      const id = start && photoIdAt(start.x, start.y);
      const anchor = photos.findIndex((photo) => photo.id === id);
      if (!start || !onSelect || anchor < 0) return false;
      const selected = !selectedIds?.has(photos[anchor].id);
      drag = {
        anchor,
        selected,
        before: new Set(selectedIds),
        range: new Set([photos[anchor].id]),
        x: start.x,
        y: start.y,
      };
      swallowClick = true;
      onSelect([photos[anchor]], selected);
      navigator.vibrate?.(10);
      frame = requestAnimationFrame(autoScroll);
      return true;
    }

    function onTouchMove(event: TouchEvent) {
      if (drag) {
        if (event.touches.length !== 1) return stopDrag();
        // 範囲を選んでいる間はページをスクロールさせない
        if (event.cancelable) event.preventDefault();
        drag.x = event.touches[0].clientX;
        drag.y = event.touches[0].clientY;
        extendTo(drag.x, drag.y);
        return;
      }
      const touch = event.touches[0];
      if (!start) return;
      if (event.touches.length !== 1) return cancelPress();
      const dx = Math.abs(touch.clientX - start.x);
      const dy = Math.abs(touch.clientY - start.y);
      if (Math.hypot(dx, dy) <= LONG_PRESS_SLOP) return;
      // 選択中に横へ動かしたら、長押しを待たずに範囲選択にする
      if (latest.current.selecting && dx > dy * SWIPE_RATIO && event.cancelable) {
        if (timer) clearTimeout(timer);
        timer = null;
        if (beginDrag()) {
          event.preventDefault();
          drag!.x = touch.clientX;
          drag!.y = touch.clientY;
          extendTo(touch.clientX, touch.clientY);
          return;
        }
      }
      cancelPress();
    }

    function onTouchEnd() {
      cancelPress();
      stopDrag();
    }

    function onClick(event: MouseEvent) {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    // Android の長押しメニューを出さない
    function onContextMenu(event: Event) {
      if (latest.current.onSelect && (event.target as Element).closest("[data-photo-id]")) event.preventDefault();
    }

    element.addEventListener("touchstart", onTouchStart, { passive: true });
    element.addEventListener("touchmove", onTouchMove, { passive: false });
    element.addEventListener("touchend", onTouchEnd);
    element.addEventListener("touchcancel", onTouchEnd);
    element.addEventListener("click", onClick, true);
    element.addEventListener("contextmenu", onContextMenu);
    return () => {
      cancelPress();
      stopDrag();
      element.removeEventListener("touchstart", onTouchStart);
      element.removeEventListener("touchmove", onTouchMove);
      element.removeEventListener("touchend", onTouchEnd);
      element.removeEventListener("touchcancel", onTouchEnd);
      element.removeEventListener("click", onClick, true);
      element.removeEventListener("contextmenu", onContextMenu);
    };
  }, [ref]);
}
