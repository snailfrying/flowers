import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 shadow-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border-0 shadow-none hover:opacity-90 active:opacity-80",
        destructive:
          "bg-destructive text-destructive-foreground border-0 shadow-none hover:opacity-90 active:opacity-80",
        outline:
          "border border-border bg-transparent shadow-none hover:bg-accent hover:text-accent-foreground hover:border-border/50",
        secondary:
          "bg-secondary text-secondary-foreground border-0 shadow-none hover:bg-secondary/80 active:bg-secondary/70",
        ghost: "border-0 shadow-none hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        subtle:
          "border border-zinc-200 bg-white text-zinc-700 shadow-none hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800",
        link: "text-primary underline-offset-4 hover:underline border-0 shadow-none",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-7 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
