import { ExternalLink } from "lucide-react";

export function PublicPathLinks({
  paths,
}: {
  paths: { label: string; href: string }[];
}) {
  if (paths.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      {paths.map((path) => (
        <a
          key={path.href}
          href={path.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 truncate text-[11px] font-medium text-forest-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate font-mono">{path.label}</span>
        </a>
      ))}
    </div>
  );
}
