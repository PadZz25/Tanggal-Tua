import { useEffect, useRef, useState } from 'react';

export const KEYBOARD_HEIGHT_THRESHOLD_PX = 150;
const BASELINE_WIDTH_TOLERANCE_PX = 10;

export interface ViewportMetrics {
  layoutHeight: number;
  visualHeight: number;
  visualOffsetTop: number;
  width: number;
}

export interface KeyboardVisibilityResult {
  isKeyboardOpen: boolean;
  keyboardInsetPx: number;
  nextBaselineHeight: number;
  nextBaselineWidth: number;
}

export function evaluateKeyboardVisibility(params: {
  metrics: ViewportMetrics;
  baselineHeight: number;
  baselineWidth: number;
  thresholdPx?: number;
  forceResetBaseline?: boolean;
}): KeyboardVisibilityResult {
  const {
    metrics,
    baselineHeight,
    baselineWidth,
    thresholdPx = KEYBOARD_HEIGHT_THRESHOLD_PX,
    forceResetBaseline = false,
  } = params;

  const currentHeight =
    metrics.visualHeight > 0 ? metrics.visualHeight : metrics.layoutHeight;
  const fullHeight = Math.max(metrics.layoutHeight, currentHeight);
  const widthChanged =
    baselineWidth > 0 &&
    Math.abs(metrics.width - baselineWidth) > BASELINE_WIDTH_TOLERANCE_PX;

  let nextBaselineHeight = baselineHeight;
  let nextBaselineWidth = baselineWidth;

  if (forceResetBaseline || widthChanged || baselineHeight <= 0) {
    nextBaselineHeight = fullHeight;
    nextBaselineWidth = metrics.width;
  } else if (fullHeight > baselineHeight) {
    nextBaselineHeight = fullHeight;
  }

  const isKeyboardOpen =
    nextBaselineHeight > 0 &&
    currentHeight > 0 &&
    currentHeight < nextBaselineHeight - thresholdPx;

  const keyboardInsetPx = isKeyboardOpen
    ? Math.max(
        0,
        Math.round(metrics.layoutHeight - (currentHeight + metrics.visualOffsetTop))
      )
    : 0;

  return {
    isKeyboardOpen,
    keyboardInsetPx,
    nextBaselineHeight,
    nextBaselineWidth,
  };
}

export function readViewportMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return { layoutHeight: 0, visualHeight: 0, visualOffsetTop: 0, width: 0 };
  }

  const vv = window.visualViewport;
  return {
    layoutHeight: window.innerHeight,
    visualHeight: vv?.height ?? window.innerHeight,
    visualOffsetTop: vv?.offsetTop ?? 0,
    width: vv?.width ?? window.innerWidth,
  };
}

export function isEditableElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return el.isContentEditable;
}

export function useViewportKeyboard(routeKey?: string): {
  isKeyboardOpen: boolean;
  keyboardInsetPx: number;
} {
  const baselineRef = useRef<{ height: number; width: number }>({
    height: 0,
    width: 0,
  });

  if (baselineRef.current.height === 0 && typeof window !== 'undefined') {
    const initial = readViewportMetrics();
    baselineRef.current = {
      height: Math.max(initial.layoutHeight, initial.visualHeight),
      width: initial.width,
    };
  }

  const [state, setState] = useState<{
    isKeyboardOpen: boolean;
    keyboardInsetPx: number;
  }>({
    isKeyboardOpen: false,
    keyboardInsetPx: 0,
  });

  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const recompute = (forceResetBaseline = false) => {
      const metrics = readViewportMetrics();
      const result = evaluateKeyboardVisibility({
        metrics,
        baselineHeight: baselineRef.current.height,
        baselineWidth: baselineRef.current.width,
        forceResetBaseline,
      });

      baselineRef.current = {
        height: result.nextBaselineHeight,
        width: result.nextBaselineWidth,
      };

      setState((prev) =>
        prev.isKeyboardOpen === result.isKeyboardOpen &&
        prev.keyboardInsetPx === result.keyboardInsetPx
          ? prev
          : {
              isKeyboardOpen: result.isKeyboardOpen,
              keyboardInsetPx: result.keyboardInsetPx,
            }
      );
    };

    const scheduleFrame = (fn: () => void) => {
      if (typeof window.requestAnimationFrame !== 'function') {
        fn();
        return;
      }
      if (rafIdRef.current !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = window.requestAnimationFrame(() => {
        rafIdRef.current = null;
        fn();
      });
    };

    const handleViewportChange = () => recompute(false);
    const handleOrientationChange = () => {
      recompute(true);
      scheduleFrame(() => recompute(true));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        recompute(!isEditableElement(document.activeElement));
      }
    };
    const handleFocusIn = () => recompute(false);
    const handleFocusOut = () => {
      recompute(false);
      scheduleFrame(() => recompute(false));
    };

    recompute(!isEditableElement(document.activeElement));

    const vv = window.visualViewport;
    vv?.addEventListener('resize', handleViewportChange);
    vv?.addEventListener('scroll', handleViewportChange);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focusin', handleFocusIn);
    window.addEventListener('focusout', handleFocusOut);

    return () => {
      vv?.removeEventListener('resize', handleViewportChange);
      vv?.removeEventListener('scroll', handleViewportChange);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focusin', handleFocusIn);
      window.removeEventListener('focusout', handleFocusOut);
      if (rafIdRef.current !== null && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [routeKey]);

  return state;
}
