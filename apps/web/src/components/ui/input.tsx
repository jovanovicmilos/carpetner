// shadcn Input, Kroj look (docs/UI_KOMPONENTE.md): white, line-strong border, active field border-primary. Sizes come from the caller.
import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input type={type} data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-md border border-solid border-line-strong bg-white px-3 font-sans text-sm text-foreground outline-none placeholder:text-muted-2 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
