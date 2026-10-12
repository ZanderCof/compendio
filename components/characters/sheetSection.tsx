import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SheetSectionProps = {
  title: string
  action?: React.ReactNode
  className?: string
  children: React.ReactNode
}

export function SheetSection({ title, action, className, children }: SheetSectionProps) {
  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg tracking-wide text-primary">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
