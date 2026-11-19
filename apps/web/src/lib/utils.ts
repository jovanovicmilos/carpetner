// shadcn/ui helper: joins class names and lets later Tailwind classes win (docs/UI_KOMPONENTE.md).
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
