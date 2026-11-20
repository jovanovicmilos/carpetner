import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

// Shared Tailwind class strings of the converted screens (docs/UI_KOMPONENTE.md).
export const APP = 'flex min-h-screen flex-col';
export const ALERT = 'rounded-lg bg-warn-soft px-3.5 py-2.5 text-[14px] text-warn-ink';
// Work screens: full height, the page never scrolls (docs/UI_PRAVILA.md); `app-fixed` stays as the marker Header reads.
export const APP_FIXED = 'app-fixed flex h-screen flex-col overflow-hidden';
export const BACK = 'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-solid border-border bg-white px-2.5 text-[13px] text-foreground no-underline';

/** shadcn Select over a list of [value, text] (replaces the old native selects); numbers come back as numbers. */
export function Choice<T extends string | number>({ value, onChange, options, label, className, disabled }: {
  value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode, boolean?])[]; label: string; className?: string; disabled?: boolean;
}) {
  return (
    <Select value={String(value)} disabled={disabled} onValueChange={s => { const o = options.find(([v]) => String(v) === s); if (o) onChange(o[0]); }}>
      <SelectTrigger aria-label={label} className={className}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map(([v, t, off]) => <SelectItem key={String(v)} value={String(v)} disabled={off}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );
}

// 36 px icon button of the plan tools and action bar (design/screens/Main.html `k-ib`), its name as an instant tooltip below.
export const ICON_BTN = 'relative inline-flex size-9 flex-none cursor-pointer items-center justify-center gap-1 rounded-[7px] border-0 bg-transparent p-0 font-mono text-[12px] font-semibold text-foreground no-underline hover:not-aria-pressed:bg-[#F3F1EC] focus-visible:ring-0 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary disabled:cursor-default disabled:bg-transparent disabled:text-[#BDB6AA] disabled:opacity-100 aria-pressed:bg-dark aria-pressed:text-white';
export function IconBtn({ tip, light, to, className, children, ...p }: ComponentProps<'button'> & { tip: string; light?: boolean; to?: string }) {
  const cls = cn(ICON_BTN, className);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {to
          ? <Button asChild variant={null} size="none" className={cls}><Link to={to} aria-label={p['aria-label'] ?? tip}>{children}</Link></Button>
          : <Button variant={null} size="none" aria-label={tip} className={cls} {...p}>{children}</Button>}
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={7} className={cn('max-w-none rounded-[5px] px-2 py-[5px] text-[12px] leading-[1.3] font-medium whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.18)]',
        light ? 'border border-solid border-border bg-white text-foreground' : 'bg-dark text-[#F3F1EC]')}>{tip}</TooltipContent>
    </Tooltip>
  );
}
