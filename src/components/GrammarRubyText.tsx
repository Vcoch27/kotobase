import { Fragment } from 'react';

/** Render only validated {kanji|reading} tokens; plain text remains the source for search and audio. */
export function GrammarRubyText({ text, rubyText }: { text: string; rubyText?: string }) {
  if (!rubyText) return <>{text}</>;
  return <>{rubyText.split(/(\{[^{}|]+\|[^{}]+\})/g).map((part, index) => {
    const match = /^\{([^{}|]+)\|([^{}]+)\}$/.exec(part);
    return match ? <ruby className="grammar-ruby" key={index}>{match[1]}<rt>{match[2]}</rt></ruby> : <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
