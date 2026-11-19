// shadcn ToggleGroup, Kroj version (docs/UI_KOMPONENTE.md "Segmentirane kontrole"): Radix gives the behaviour (one pick,
// arrow keys, role radio), the look comes from the caller's classes — each reference screen draws its segments differently.
// Selected item: data-state="on".
import * as React from "react"
import { cn } from "@/lib/utils"
import { ToggleGroup as ToggleGroupPrimitive } from "radix-ui"

function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return <ToggleGroupPrimitive.Root data-slot="toggle-group" className={className} {...props} />
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item data-slot="toggle-group-item"
      className={cn("cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1", className)} {...props} />
  )
}

export { ToggleGroup, ToggleGroupItem }
