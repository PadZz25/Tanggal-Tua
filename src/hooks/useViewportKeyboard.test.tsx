import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  evaluateKeyboardVisibility,
  useViewportKeyboard,
} from './useViewportKeyboard';

class MockVisualViewport extends EventTarget {
  height: number;
  width: number;
  offsetTop: number;

  constructor(width = 390, height = 844, offsetTop = 0) {
    super();
    this.width = width;
    this.height = height;
    this.offsetTop = offsetTop;
  }
}

describe('useViewportKeyboard & evaluateKeyboardVisibility', () => {
  const originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport');
  const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
  const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');

  afterEach(() => {
    if (originalVisualViewport) {
      Object.defineProperty(window, 'visualViewport', originalVisualViewport);
    } else {
      Reflect.deleteProperty(window, 'visualViewport');
    }
    if (originalInnerHeight) {
      Object.defineProperty(window, 'innerHeight', originalInnerHeight);
    }
    if (originalInnerWidth) {
      Object.defineProperty(window, 'innerWidth', originalInnerWidth);
    }
    document.body.innerHTML = '';
  });

  it('evaluates keyboard visibility from height drop without sticky focus state', () => {
    const initial = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 844, visualHeight: 844, visualOffsetTop: 0, width: 390 },
      baselineHeight: 844,
      baselineWidth: 390,
    });
    expect(initial.isKeyboardOpen).toBe(false);
    expect(initial.keyboardInsetPx).toBe(0);

    // resizes-visual: visualViewport shrinks while innerHeight stays 844
    const shrunkVisual = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 844, visualHeight: 500, visualOffsetTop: 0, width: 390 },
      baselineHeight: initial.nextBaselineHeight,
      baselineWidth: initial.nextBaselineWidth,
    });
    expect(shrunkVisual.isKeyboardOpen).toBe(true);
    expect(shrunkVisual.keyboardInsetPx).toBe(344);

    // resizes-content: both layoutHeight and visualHeight shrink together
    const shrunkContent = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 500, visualHeight: 500, visualOffsetTop: 0, width: 390 },
      baselineHeight: initial.nextBaselineHeight,
      baselineWidth: initial.nextBaselineWidth,
    });
    expect(shrunkContent.isKeyboardOpen).toBe(true);
    expect(shrunkContent.keyboardInsetPx).toBe(0);

    // Keyboard closes (restores to 844) without blur -> immediately returns false
    const restored = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 844, visualHeight: 844, visualOffsetTop: 0, width: 390 },
      baselineHeight: shrunkVisual.nextBaselineHeight,
      baselineWidth: shrunkVisual.nextBaselineWidth,
    });
    expect(restored.isKeyboardOpen).toBe(false);
    expect(restored.keyboardInsetPx).toBe(0);

    // Small browser URL bar appearance (< 150px delta) must not hide navigation
    const smallDelta = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 784, visualHeight: 784, visualOffsetTop: 0, width: 390 },
      baselineHeight: 844,
      baselineWidth: 390,
    });
    expect(smallDelta.isKeyboardOpen).toBe(false);

    // Orientation rotation changes width and resets baseline
    const rotated = evaluateKeyboardVisibility({
      metrics: { layoutHeight: 390, visualHeight: 390, visualOffsetTop: 0, width: 844 },
      baselineHeight: 844,
      baselineWidth: 390,
      forceResetBaseline: true,
    });
    expect(rotated.isKeyboardOpen).toBe(false);
    expect(rotated.nextBaselineHeight).toBe(390);
    expect(rotated.nextBaselineWidth).toBe(844);
  });

  it('tracks mocked visualViewport shrink and recovery without blur, plus orientation and visibility events', () => {
    const mockVv = new MockVisualViewport(390, 844, 0);
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      value: mockVv,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      writable: true,
      value: 844,
    });
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const { result } = renderHook(({ route }) => useViewportKeyboard(route), {
      initialProps: { route: '/' },
    });

    expect(result.current.isKeyboardOpen).toBe(false);

    // Focusing input without viewport shrink must NOT hide nav
    act(() => {
      input.focus();
      window.dispatchEvent(new FocusEvent('focusin'));
    });
    expect(document.activeElement).toBe(input);
    expect(result.current.isKeyboardOpen).toBe(false);

    // Shrink visualViewport to simulate keyboard opening
    act(() => {
      mockVv.height = 500;
      mockVv.dispatchEvent(new Event('resize'));
    });
    expect(result.current.isKeyboardOpen).toBe(true);
    expect(result.current.keyboardInsetPx).toBe(344);

    // Restore visualViewport WITHOUT blur (Android back gesture dismissing keyboard)
    act(() => {
      mockVv.height = 844;
      mockVv.dispatchEvent(new Event('resize'));
    });
    expect(document.activeElement).toBe(input);
    expect(result.current.isKeyboardOpen).toBe(false);
    expect(result.current.keyboardInsetPx).toBe(0);

    // Shrink again and recover when app returns visible via visibilitychange with non-editable focus
    act(() => {
      mockVv.height = 480;
      mockVv.dispatchEvent(new Event('resize'));
    });
    expect(result.current.isKeyboardOpen).toBe(true);

    act(() => {
      input.blur();
      mockVv.height = 844;
      mockVv.dispatchEvent(new Event('resize'));
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.isKeyboardOpen).toBe(false);

    // Orientation change resets baseline height to landscape height cleanly
    act(() => {
      mockVv.width = 844;
      mockVv.height = 390;
      window.innerWidth = 844;
      window.innerHeight = 390;
      window.dispatchEvent(new Event('orientationchange'));
    });
    expect(result.current.isKeyboardOpen).toBe(false);
  });
});
