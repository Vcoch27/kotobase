interface ShortcutActions {
  canSpeak(): boolean;
  canSkip(): boolean;
  canAdvance(): boolean;
  startHeld(): void;
  releaseHeld(): void;
  skip(): void;
  advance(): void;
  pause(): void;
}
/** Plain Tab skips; Shift+Tab remains available for keyboard navigation. */
export function bindSpeakingShortcuts(
  target: Window,
  actions: ShortcutActions,
) {
  let held = false;
  const release = () => {
    if (held) {
      held = false;
      actions.releaseHeld();
    }
  };
  const down = (event: KeyboardEvent) => {
    const element = event.target as HTMLElement | null;
    if (
      event.isComposing ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      element?.closest(
        'input,textarea,select,[contenteditable="true"],[role="dialog"]',
      )
    )
      return;
    if (event.code === "Space" && !event.shiftKey && actions.canSpeak()) {
      event.preventDefault();
      if (!held && !event.repeat) {
        held = true;
        actions.startHeld();
      }
    } else if (event.key === "Tab" && !event.shiftKey && actions.canSkip()) {
      event.preventDefault();
      if (!event.repeat) {
        release();
        actions.skip();
      }
    } else if (
      event.key === "Enter" &&
      actions.canAdvance() &&
      !element?.closest("button,a,summary")
    ) {
      event.preventDefault();
      if (!event.repeat) actions.advance();
    } else if (event.key === "Escape") {
      release();
      actions.pause();
    }
  };
  const up = (event: KeyboardEvent) => {
    if (event.code === "Space" && held) {
      event.preventDefault();
      release();
    }
  };
  const blur = () => {
    release();
    actions.pause();
  };
  target.addEventListener("keydown", down);
  target.addEventListener("keyup", up);
  target.addEventListener("blur", blur);
  return () => {
    release();
    target.removeEventListener("keydown", down);
    target.removeEventListener("keyup", up);
    target.removeEventListener("blur", blur);
  };
}
