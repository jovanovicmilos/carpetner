// shadcn Slider, Kroj look (docs/UI_KOMPONENTE.md): thin line track, primary range, white thumb with the primary ring.
import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root data-slot="slider" className={cn("relative flex h-5 w-28 touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 grow overflow-hidden rounded-full bg-border">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb aria-label={props["aria-label"]} className="block size-4 cursor-pointer rounded-full border-2 border-solid border-primary bg-white outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </SliderPrimitive.Root>
  )
}

export { Slider }
