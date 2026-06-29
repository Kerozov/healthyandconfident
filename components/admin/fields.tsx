import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft/70">{hint}</span>}
    </label>
  );
}

const base =
  "w-full rounded-xl border border-ink/15 bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-coral-400 focus:ring-2 focus:ring-coral-400/20";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(base, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(base, "resize-y", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(base, props.className)} />;
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-2xl border border-ink/10 bg-white p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title ? <h2 className="font-display text-lg font-semibold">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
