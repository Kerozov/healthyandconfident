import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: "bg-coral-500 text-white hover:bg-coral-600",
        secondary: "border border-ink/15 bg-white text-ink hover:bg-cream-2",
        ghost: "text-ink-soft hover:bg-ink/5 hover:text-ink",
        danger: "border border-coral-200 text-coral-700 hover:bg-coral-50",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-6 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type AdminButtonProps = VariantProps<typeof buttonVariants> & {
  className?: string;
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  "aria-label"?: string;
};

type AdminButtonLink = AdminButtonProps & {
  href: string;
  target?: string;
  rel?: string;
};

export function AdminButton(props: AdminButtonProps | AdminButtonLink) {
  const { variant, size, className, children } = props;
  const classes = cn(buttonVariants({ variant, size }), className);

  if ("href" in props && props.href) {
    const { href, target, rel } = props;
    const external = href.startsWith("http");
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

  const { type = "button", disabled, onClick, "aria-label": ariaLabel } = props;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      aria-label={ariaLabel}
      className={classes}
    >
      {children}
    </button>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-ink/10 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-soft">
              {description}
            </p>
          )}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}

export function Alert({
  variant = "info",
  children,
  className,
}: {
  variant?: "info" | "warning" | "success";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-xl px-4 py-3 text-sm leading-relaxed",
        variant === "info" && "bg-forest-50 text-forest-800",
        variant === "warning" && "bg-gold-400/15 text-ink",
        variant === "success" && "bg-forest-500/10 text-forest-800",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "forest";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "neutral" && "bg-ink/5 text-ink-soft",
        tone === "success" && "bg-forest-500/15 text-forest-700",
        tone === "warning" && "bg-gold-400/20 text-gold-600",
        tone === "forest" && "bg-forest-50 text-forest-700",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function DataTable({
  children,
  empty,
}: {
  children: React.ReactNode;
  empty?: React.ReactNode;
}) {
  if (empty) {
    return (
      <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white p-8 text-center text-sm text-ink-soft">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function TabList({
  tabs,
  active,
  onChange,
  "aria-label": ariaLabel,
}: {
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  active: string;
  onChange: (id: string) => void;
  "aria-label"?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-ink/10 bg-white p-1"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-500/35",
              selected ? "bg-forest-600 text-cream" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            {tab.icon}
            {tab.label}
            {typeof tab.count === "number" && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selected ? "bg-white/20" : "bg-ink/5",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
