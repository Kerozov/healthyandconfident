import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-gold-400 font-semibold text-forest-900 shadow-sm hover:bg-gold-500 hover:shadow-md",
        secondary:
          "border-2 border-green-500 bg-transparent font-medium text-green-700 hover:bg-green-50",
        forest:
          "bg-green-600 font-semibold text-white hover:bg-green-700",
        outline:
          "border border-green-400 bg-transparent font-medium text-green-700 hover:bg-green-50",
        ghost: "text-forest-800 hover:bg-green-50",
        gold:
          "bg-gold-400 font-bold text-forest-900 shadow-md hover:bg-gold-500 hover:shadow-lg",
      },
      size: {
        sm: "h-9 px-5 py-2 text-sm font-semibold",
        md: "h-11 px-6 text-sm font-semibold",
        lg: "px-8 py-4 text-lg font-bold",
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
