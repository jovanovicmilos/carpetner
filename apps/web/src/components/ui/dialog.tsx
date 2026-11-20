// shadcn Dialog, Kroj look (docs/UI_KOMPONENTE.md "Dijalozi"): overlay rgba(28,27,25,0.45), white card, radius 12,
// padding 22, modal shadow; width per dialog via className (440 / 480). No close icon: the design has Otkaži buttons.
import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

const Dialog = (p: React.ComponentProps<typeof DialogPrimitive.Root>) => <DialogPrimitive.Root data-slot="dialog" {...p} />
const DialogClose = (p: React.ComponentProps<typeof DialogPrimitive.Close>) => <DialogPrimitive.Close data-slot="dialog-close" {...p} />

function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay data-slot="dialog-overlay" className="fixed inset-0 z-[100] bg-[rgba(28,27,25,0.45)]" />
      <DialogPrimitive.Content data-slot="dialog-content"
        className={cn("fixed top-1/2 left-1/2 z-[101] box-border flex w-[min(440px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 flex-col gap-3.5 rounded-2xl bg-white p-[22px] font-sans text-foreground shadow-[var(--shadow-modal)] outline-none", className)}
        {...props}>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

const DialogTitle = ({ className, ...p }: React.ComponentProps<typeof DialogPrimitive.Title>) => <DialogPrimitive.Title data-slot="dialog-title" className={cn("m-0 text-[18px] font-bold", className)} {...p} />
const DialogDescription = ({ className, ...p }: React.ComponentProps<typeof DialogPrimitive.Description>) => <DialogPrimitive.Description data-slot="dialog-description" className={cn("m-0 text-[13px] leading-normal text-muted-foreground", className)} {...p} />

export { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle }
