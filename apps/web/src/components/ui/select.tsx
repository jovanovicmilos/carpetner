// shadcn Select, Kroj look (docs/UI_KOMPONENTE.md "Select polja"): white field with the line border; the list looks like the
// plan's context menu (rounded 10, 5 px padding, menu shadow, 36 px items). Trigger size per screen via className.
import * as React from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import { Select as SelectPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Select = (p: React.ComponentProps<typeof SelectPrimitive.Root>) => <SelectPrimitive.Root data-slot="select" {...p} />
const SelectValue = (p: React.ComponentProps<typeof SelectPrimitive.Value>) => <SelectPrimitive.Value data-slot="select-value" {...p} />

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger"
      className={cn("inline-flex h-10 cursor-pointer items-center justify-between gap-2 rounded-md border border-solid border-border bg-white px-2.5 font-sans text-[14px] whitespace-nowrap text-foreground outline-none focus-visible:border-primary data-[placeholder]:text-muted-2 [&>span]:truncate", className)}
      {...props}>
      {children}
      <SelectPrimitive.Icon asChild><ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={1.6} /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content data-slot="select-content" position={position} sideOffset={4}
        className={cn("z-[1000] max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-y-auto rounded-xl border border-solid border-border bg-white p-[5px] font-sans text-foreground shadow-[var(--shadow-menu)]", className)}
        {...props}>
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item data-slot="select-item"
      className={cn("relative flex h-9 cursor-pointer items-center gap-2.5 rounded-md pr-8 pl-2.5 text-[13.5px] outline-none select-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-accent", className)}
      {...props}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className="absolute right-2.5 flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><CheckIcon className="size-4 text-primary" strokeWidth={2} /></SelectPrimitive.ItemIndicator></span>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
