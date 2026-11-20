// shadcn RadioGroup, Kroj look: like the design's native radios with accent-color (18 px, orange ring + dot when picked, native margins).
import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={className} {...props} />
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item data-slot="radio-group-item"
      className={cn("mt-[3px] mr-[3px] mb-0 ml-[5px] inline-flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-full border border-solid border-muted-2 bg-white p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 data-[state=checked]:border-2 data-[state=checked]:border-primary", className)}
      {...props}>
      <RadioGroupPrimitive.Indicator data-slot="radio-group-indicator" className="size-2 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  )
}

export { RadioGroup, RadioGroupItem }
