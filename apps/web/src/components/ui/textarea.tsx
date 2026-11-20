// shadcn Textarea, Kroj look (docs/UI_KOMPONENTE.md): same field as Input; size and font from the caller.
import * as React from "react"
import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea data-slot="textarea"
      className={cn("w-full min-w-0 resize-y rounded-md border border-solid border-line-strong bg-white px-3 py-2 font-sans text-sm text-foreground outline-none placeholder:text-[#757575] focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50", className)}
      {...props}
    />
  )
}

export { Textarea }
