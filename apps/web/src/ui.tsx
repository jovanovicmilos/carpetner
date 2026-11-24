import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

// Pick-one button group (Radix ToggleGroup); look comes from the screen's own classes (each reference draws it differently).
export function SegmentedControl<T extends string | number>({ options, value, onChange, label, className, itemClass, variant, size, spacing }: {
  options: readonly (readonly [T, ReactNode])[];
  value: T | undefined;
  onChange: (v: T) => void;
  label?: string;
  className?: string;
  itemClass?: string;
  variant?: 'default' | 'outline'; size?: 'default' | 'sm' | 'lg'; spacing?: number;
}) {
  return (
    <ToggleGroup type="single" aria-label={label} className={className} variant={variant} size={size} spacing={spacing} value={value === undefined ? '' : String(value)}
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
/** Project steps (user 2026-11-22): done = light green with ✓; a control whose step is still open gets the green outline. */
export const STEP_DONE = 'border-ok-strong bg-ok-soft text-ok hover:bg-ok-soft hover:text-ok';
export const STEP_TODO = 'border-primary text-accent-ink';
export const APP_FIXED = 'app-fixed flex h-screen flex-col overflow-hidden';
export const BACK = 'inline-flex min-h-9 items-center gap-1.5 rounded-md border border-solid border-border bg-white px-2.5 text-[13px] text-foreground no-underline';

/** shadcn Select over a list of [value, text] (replaces the old native selects); numbers come back as numbers. */
export function Choice<T extends string | number>({ value, onChange, options, label, className, disabled }: {
  value: T; onChange: (v: T) => void; options: readonly (readonly [T, ReactNode, boolean?])[]; label: string; className?: string; disabled?: boolean;
}) {
  return (
    <Select value={String(value)} disabled={disabled} onValueChange={s => { const o = options.find(([v]) => String(v) === s); if (o) onChange(o[0]); }}>
      <SelectTrigger aria-label={label} className={className}><SelectValue /></SelectTrigger>
      <SelectContent position="popper">{options.map(([v, t, off]) => <SelectItem key={String(v)} value={String(v)} disabled={off}>{t}</SelectItem>)}</SelectContent>
    </Select>
  );
}

// Icon button of the plan tools and action bar = shadcn Button ghost / icon; active tool dark, its name as an instant tooltip
// in the help-popover look. `light` is kept for callers (all are light now).
export const ICON_BTN = 'relative aria-pressed:bg-dark aria-pressed:text-white aria-pressed:hover:bg-dark/90 aria-pressed:hover:text-white';
export function IconBtn({ tip, light, to, className, children, ...p }: ComponentProps<'button'> & { tip: string; light?: boolean; to?: string }) {
  const cls = cn(ICON_BTN, className);
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {to
          ? <Button asChild variant="ghost" size="icon" className={cls}><Link to={to} aria-label={p['aria-label'] ?? tip}>{children}</Link></Button>
          : <Button variant="ghost" size="icon" aria-label={tip} className={cls} {...p}>{children}</Button>}
      </TooltipTrigger>
      {/* same look as the help ⓘ popover (user 2026-11-25): white card, border, wrapped text; no arrow (it has no border) */}
      <TooltipContent side="bottom" sideOffset={6} arrow={false} className="max-w-72 rounded-md border bg-popover px-3 py-2 text-sm leading-relaxed text-popover-foreground shadow-md">{tip}</TooltipContent>
    </Tooltip>
  );
}
