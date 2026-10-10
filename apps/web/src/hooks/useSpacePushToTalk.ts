import { useEffect, useRef } from 'react';

/**
 * Checks whether the event target is inside an editable input, button, canvas, or game board
 * to prevent accidental push-to-talk activation when pressing Space during gameplay or typing.
 */
function isEditableOrInteractive(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toUpperCase();
  if (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'BUTTON' ||
    tag === 'SELECT' ||
    target.isContentEditable
  ) {
    return true;
  }
  if (
    target.closest(
      'button, input, textarea, select, [contenteditable="true"], [role="button"], [role="textbox"], canvas, [data-interactive="true"], [data-gomoku-board]'
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Global desktop Spacebar push-to-talk hook.
 * Only active when enabled (e.g. voiceMode === 'hold').
 * Safely ignores interactive elements, cleans up on unmount or blur,
 * and decouples event listeners from re-renders via ref.
 */
export function useSpacePushToTalk(
  enabled: boolean,
  onHoldToTalk: (pressed: boolean) => void
) {
  const onHoldRef = useRef(onHoldToTalk);
  useEffect(() => {
    onHoldRef.current = onHoldToTalk;
  });

  const isHoldingRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        onHoldRef.current(false);
      }
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        if (!isEditableOrInteractive(e.target)) {
          e.preventDefault();
          if (!isHoldingRef.current) {
            isHoldingRef.current = true;
            onHoldRef.current(true);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (isHoldingRef.current) {
          isHoldingRef.current = false;
          onHoldRef.current(false);
        }
      }
    };

    const handleBlur = () => {
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        onHoldRef.current(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      if (isHoldingRef.current) {
        isHoldingRef.current = false;
        onHoldRef.current(false);
      }
    };
  }, [enabled]);
}
