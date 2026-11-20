// shadcn Button, Kroj variants (docs/UI_KOMPONENTE.md). Preflight is off, so border style, background and font are set here.
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-sans no-underline outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "border-0 bg-primary font-semibold text-white",
        outline: "border border-solid border-border bg-white text-foreground",
        dark: "border border-solid border-foreground bg-white text-foreground", // "Sačuvaj kao šablon"
        ghost: "border-0 bg-transparent text-foreground hover:bg-muted",
        link: "h-auto border-0 bg-transparent p-0 text-primary underline-offset-2 hover:underline",
      },
      size: {
        default: "h-[42px] rounded-md px-4 text-sm",
        sm: "h-9 rounded-md px-3 text-[13px]",
        icon: "size-9 rounded-[7px] p-0",
        none: "",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({ className, variant, size, asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
}

export { Button, buttonVariants }
