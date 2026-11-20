// shadcn Badge, Kroj tones (docs/UI_KOMPONENTE.md "Oznake statusa"); size and radius per screen via className.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva("inline-flex shrink-0 items-center whitespace-nowrap font-sans", {
  variants: {
    tone: {
      warn: "bg-accent-soft text-accent-ink",
      ok: "bg-ok-soft text-ok",
      neutral: "bg-muted text-muted-foreground",
      accent: "bg-accent-on-dark text-foreground",
      none: "",
    },
  },
  defaultVariants: { tone: "neutral" },
})

function Badge({ className, tone, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
