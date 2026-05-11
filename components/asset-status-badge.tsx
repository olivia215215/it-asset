import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type AssetInstanceStatus =
  | "IN_STOCK"
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_USE"
  | "RETURNING"
  | "REPAIRING"
  | "TRANSFERRING"
  | "LOST"
  | "SCRAPPED";

const statusConfig: Record<
  AssetInstanceStatus,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link"; className?: string }
> = {
  IN_STOCK: { label: "在库", variant: "ghost", className: "text-muted-foreground" },
  AVAILABLE: { label: "可用", variant: "default", className: "bg-green-500/10 text-green-600 hover:bg-green-500/20 dark:text-green-400" },
  ASSIGNED: { label: "已分配", variant: "default", className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400" },
  IN_USE: { label: "使用中", variant: "default", className: "bg-teal-500/10 text-teal-600 hover:bg-teal-500/20 dark:text-teal-400" },
  RETURNING: { label: "归还中", variant: "outline", className: "border-yellow-400 text-yellow-600 dark:text-yellow-400" },
  REPAIRING: { label: "维修中", variant: "outline", className: "border-orange-400 text-orange-600 dark:text-orange-400" },
  TRANSFERRING: { label: "调拨中", variant: "outline", className: "border-purple-400 text-purple-600 dark:text-purple-400" },
  LOST: { label: "丢失", variant: "destructive" },
  SCRAPPED: { label: "已报废", variant: "ghost", className: "text-muted-foreground" },
};

interface AssetStatusBadgeProps {
  status: AssetInstanceStatus;
  className?: string;
}

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    variant: "outline" as const,
  };

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className, className)}
    >
      {config.label}
    </Badge>
  );
}
