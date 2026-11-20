// shadcn Tabs, Kroj version: Radix gives the behaviour (role tab, arrow keys); the look comes from the caller, because the
// design has two kinds (segment: Biblioteka, Projekti filters, Prijava; underlined: admin). Selected tab: data-state="active".
import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"

function Tabs(props: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root data-slot="tabs" {...props} />
}

function TabsList(props: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List data-slot="tabs-list" {...props} />
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger data-slot="tabs-trigger"
    className={cn("cursor-pointer font-sans outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset", className)} {...props} />
}

function TabsContent(props: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
