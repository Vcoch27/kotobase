import { Fragment } from 'react';

function renderInlineReadings(value: string, prefix: string) {
  return value.split(/([\u3400-\u9fff々〆ヶ]+\([ぁ-んァ-ンー]+\))/g).map((part, index) => {
    const match = /^([\u3400-\u9fff々〆ヶ]+)\(([ぁ-んァ-ンー]+)\)$/.exec(part);
    return match
      ? <ruby className="grammar-ruby" key={`${prefix}-${index}`}>{match[1]}<rt>{match[2]}</rt></ruby>
      : <Fragment key={`${prefix}-${index}`}>{part}</Fragment>;
  });
}

/** Render validated ruby tokens and inline kanji(reading) pairs without changing source text. */
export function GrammarRubyText({ text, rubyText }: { text: string; rubyText?: string }) {
  if (!rubyText) return <>{renderInlineReadings(text, 'plain')}</>;
  return <>{rubyText.split(/(\{[^{}|]+\|[^{}]+\})/g).map((part, index) => {
    const match = /^\{([^{}|]+)\|([^{}]+)\}$/.exec(part);
    return match ? <ruby className="grammar-ruby" key={index}>{match[1]}<rt>{match[2]}</rt></ruby> : <Fragment key={index}>{renderInlineReadings(part, String(index))}</Fragment>;
  })}</>;
}
