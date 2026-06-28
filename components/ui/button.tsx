import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-rose-400 text-white shadow-sm hover:bg-rose-500 hover:shadow-md",
        secondary:
          "border border-rose-300 bg-transparent text-rose-500 hover:bg-rose-50",
        forest:
          "bg-sage-600 text-white hover:bg-sage-800",
        outline:
          "border border-rose-300 bg-transparent text-rose-500 hover:bg-rose-50",
        ghost: "text-warm-800 hover:bg-rose-50",
        gold: "bg-peach-400 text-warm-900 hover:bg-peach-500",
      },
      size: {
        sm: "h-9 px-5 py-2 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "px-8 py-3.5 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type CommonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = CommonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant, size, className, children } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  if ("href" in props && props.href !== undefined) {
    const { href, target, rel } = props;
    const external =
      href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:");
    if (external) {
      return (
        <a href={href} target={target} rel={rel} className={classes}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...rest } =
    props as React.ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} className={classes} {...rest}>
      {children}
    </button>
  );
}

export { buttonVariants };
