"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

type Option = { value: string; label: string; detail?: string };

/** Compact, keyboard-accessible picker; portal avoids clipping inside the player. */
export function ListeningSelect({ label, value, options, onChange, placeholder = "Chọn…", disabled = false, className = "" }: {
  label: string; value: string; options: Option[]; onChange: (value: string) => void;
  placeholder?: string; disabled?: boolean; className?: string;
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [bounds, setBounds] = useState({ left: 0, top: 0, width: 0, maxHeight: 260 });
  const selected = options.find(option => option.value === value);
  function show() {
    if (disabled || !options.length || !trigger.current) return;
    const rect = trigger.current.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16);
    const below = window.innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const height = Math.min(260, Math.max(below, above));
    setBounds({ left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), top: below >= Math.min(260, above) ? rect.bottom + 4 : Math.max(8, rect.top - height - 4), width, maxHeight: height });
    setActive(Math.max(0, options.findIndex(option => option.value === value))); setOpen(true);
  }
  function choose(index: number) {
    if (options[index]) onChange(options[index].value);
    setOpen(false); trigger.current?.focus();
  }
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const dismiss = (event: Event) => {
      if (!list.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) setOpen(false);
    };
    const resize = () => setOpen(false);
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("scroll", dismiss, true); window.removeEventListener("resize", resize); };
  }, [open]);
  useEffect(() => { if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView({ block: "nearest" }); }, [active, open, id]);
  useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <>
    <button ref={trigger} type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined} disabled={disabled}
      className={`flex min-h-10 min-w-0 items-center gap-2 rounded-lg bg-surface-raised px-3 py-2 text-left text-body-sm focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 ${className}`}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={event => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); show(); } }}>
      <span className="min-w-0 flex-1 truncate font-semibold">{selected?.label || placeholder}</span>
      {selected?.detail && <span className="hidden shrink-0 text-caption text-text-muted sm:inline">{selected.detail}</span>}
      <ChevronDown size={15} className={`shrink-0 text-text-muted transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && createPortal(<div className="listening-page" style={{ position: "fixed", zIndex: 100, ...bounds }}>
      <div ref={list} id={id} role="listbox" tabIndex={-1} aria-label={label} aria-activedescendant={options[active] ? `${id}-${active}` : undefined}
        className="overflow-y-auto overscroll-contain rounded-xl border border-text-muted/20 bg-surface p-1 text-text-primary shadow-xl outline-none" style={{ maxHeight: bounds.maxHeight }}
        onKeyDown={event => {
          if (["ArrowDown", "ArrowUp", "Home", "End", "Enter", " ", "Escape"].includes(event.key)) event.preventDefault();
          if (event.key === "ArrowDown") setActive(index => Math.min(options.length - 1, index + 1));
          else if (event.key === "ArrowUp") setActive(index => Math.max(0, index - 1));
          else if (event.key === "Home") setActive(0);
          else if (event.key === "End") setActive(options.length - 1);
          else if (event.key === "Enter" || event.key === " ") choose(active);
          else if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
          else if (event.key === "Tab") { setOpen(false); trigger.current?.focus(); }
          else if (event.key.length === 1) { const index = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase())); if (index >= 0) setActive(index); }
        }}>
        {options.map((option, index) => <div id={`${id}-${index}`} key={option.value} role="option" aria-selected={option.value === value}
          className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${index === active ? "bg-accent-muted" : "hover:bg-surface-raised"} ${option.value === value ? "text-primary" : ""}`}
          onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
          <span className="min-w-0 flex-1"><span className="block truncate text-body-sm font-semibold">{option.label}</span>{option.detail && <span className="block text-caption text-text-muted">{option.detail}</span>}</span>
          {option.value === value && <Check size={16} className="shrink-0" />}
        </div>)}
      </div>
    </div>, document.fullscreenElement || document.body)}
  </>;
}
