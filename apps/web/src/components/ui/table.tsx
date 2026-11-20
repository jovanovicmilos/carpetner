// shadcn Table, Kroj version: plain table parts; each screen's table sets its own padding and lines (they differ per reference).
import * as React from "react"
import { cn } from "@/lib/utils"

const Table = ({ className, ...p }: React.ComponentProps<"table">) => <table data-slot="table" className={cn("w-full border-collapse", className)} {...p} />
const TableHeader = (p: React.ComponentProps<"thead">) => <thead data-slot="table-header" {...p} />
const TableBody = (p: React.ComponentProps<"tbody">) => <tbody data-slot="table-body" {...p} />
const TableRow = (p: React.ComponentProps<"tr">) => <tr data-slot="table-row" {...p} />
const TableHead = ({ className, ...p }: React.ComponentProps<"th">) => <th data-slot="table-head" className={cn("text-left", className)} {...p} />
const TableCell = (p: React.ComponentProps<"td">) => <td data-slot="table-cell" {...p} />

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell }
