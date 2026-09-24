import { Info, TriangleAlert, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type CalloutProps = {
  title?: string;
  children: React.ReactNode;
  variant?: "info" | "warning" | "success";
  className?: string;
};

const variants = {
  info: { icon: Info, classes: "border-primary/25 bg-primary/5", iconClass: "text-primary" },
  warning: { icon: TriangleAlert, classes: "border-amber-500/25 bg-amber-500/5", iconClass: "text-amber-500" },
  success: { icon: CheckCircle2, classes: "border-emerald-500/25 bg-emerald-500/5", iconClass: "text-emerald-500" },
};

export function Callout({ title, children, variant = "info", className }: CalloutProps) {
  const { icon: Icon, classes, iconClass } = variants[variant];
  return (
    <div className={cn("flex gap-3 rounded-xl border p-4 my-6", classes, className)}>
      <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", iconClass)} />
      <div className="text-sm text-muted-foreground leading-relaxed">
        {title && <p className="font-semibold text-foreground mb-1">{title}</p>}
        {children}
      </div>
    </div>
  );
}
