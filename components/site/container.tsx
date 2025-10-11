import type * as React from "react"
import { cn } from "@/lib/utils"

type ContainerProps = React.PropsWithChildren<{
  className?: string
  as?: React.ElementType
  role?: string
}>

export function Container({ children, className, as: Tag = "div", role }: ContainerProps) {
  return (
    <Tag
      role={role}
      className={cn(
        // centered max width + responsive gutters
        className,
      )}
    >
      {children}
    </Tag>
  )
}
