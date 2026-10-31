/** Replay keys are never part of a Japanese dictation answer, including IME full-width output. */
export function sanitizeListeningDictation(value: string): string {
  return value.replace(/[`｀‘’]/g, "");
}

interface ListeningShortcutActions {
  stage(): "dictation" | "meaning" | "result";
  composing(): boolean;
  replay(): void;
  skip(): void;
  commit(): void;
  advance(): void;
  choose(position: number): void;
}

/** Capture replay before text fields/IME consume Backquote. Never commit an IME Enter. */
export function bindListeningShortcuts(target: Window, actions: ListeningShortcutActions) {
  const handle = (event: KeyboardEvent) => {
    const element = event.target as HTMLElement | null;
    if (event.ctrlKey || event.altKey || event.metaKey ||
        element?.closest('[role="dialog"]')) return;
    const editable = element?.closest('input,textarea,select,[contenteditable="true"]');
    const ownField = !!element?.closest('[data-listening-quiz]');
    if (editable && !ownField) return;

    // An IME can mark even the physical Backquote key as composing/keyCode 229.
    // Replay does not submit or alter the composition, so handle it first.
    if ((event.code === "Backquote" || event.key === "`") && !event.shiftKey &&
        !element?.closest('select')) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) actions.replay();
      return;
    }
    if (event.isComposing || event.keyCode === 229 || actions.composing() || event.repeat ||
        element?.closest('select,textarea,[contenteditable="true"]')) return;
    if (editable && element?.id !== "listening-dictation") return;
    const stage = actions.stage();
    if (event.key === "Tab" && !event.shiftKey && stage !== "result") {
      event.preventDefault(); actions.skip();
    } else if (/^[1-4]$/.test(event.key) && stage === "meaning" && !editable) {
      event.preventDefault(); actions.choose(Number(event.key) - 1);
    } else if (event.key === "Enter" && !element?.closest('button,a,summary')) {
      event.preventDefault();
      if (stage === "result") actions.advance();
      else if (stage === "dictation") actions.commit();
    }
  };
  target.addEventListener("keydown", handle, true);
  return () => target.removeEventListener("keydown", handle, true);
}
