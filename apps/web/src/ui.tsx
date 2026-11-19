import type { ReactNode } from 'react';

// Pick-one button group; look comes from the screen's own classes (each reference draws it differently).
export function SegmentedControl<T extends string | number>({ options, value, onChange, label, className, itemClass }: {
  options: readonly (readonly [T, ReactNode])[];
  value: T | undefined;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
  itemClass?: string;
}) {
  return (
    <div role="group" aria-label={label} className={className}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={itemClass} aria-pressed={value === v} onClick={() => value !== v && onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

export function download(name: string, data: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000); // revoking at once can cancel the second of two quick downloads
}
