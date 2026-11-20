// shadcn Progress, Kroj look (docs/UI_KOMPONENTE.md "Trake napretka"): track and fill colours and height per screen via className.
import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Progress({ className, indicatorClassName, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn("relative h-1.5 w-full overflow-hidden rounded-[3px] bg-line-soft", className)} {...props}>
      <ProgressPrimitive.Indicator data-slot="progress-indicator" className={cn("h-full w-full bg-accent-on-dark", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }} />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
