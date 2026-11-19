import type { CSSProperties } from 'react';
import type { ReactNode } from 'react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Pick-one button group (Radix ToggleGroup); look comes from the screen's own classes (each reference draws it differently).
export function SegmentedControl<T extends string | number>({ options, value, onChange, label, className, itemClass }: {
  options: readonly (readonly [T, ReactNode])[];
  value: T | undefined;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
  itemClass?: string;
}) {
  return (
    <ToggleGroup type="single" aria-label={label} className={className} value={value === undefined ? '' : String(value)}
      onValueChange={s => { const o = options.find(([v]) => String(v) === s); if (o && o[0] !== value) onChange(o[0]); }}>
      {options.map(([v, text]) => <ToggleGroupItem key={v} value={String(v)} className={itemClass}>{text}</ToggleGroupItem>)}
    </ToggleGroup>
  );
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once can cancel the second of two quick downloads
}

/** Design inline style string → React style, so reference markup can stay 1:1. */
export const sx = (s: string): CSSProperties => Object.fromEntries(s.split(';').map(d => d.trim()).filter(Boolean).map(d => {
  const i = d.indexOf(':');
  return [d.slice(0, i).trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), d.slice(i + 1).trim()];
}));
