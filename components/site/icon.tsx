import {
  Activity,
  HeartPulse,
  Scale,
  BatteryLow,
  Wind,
  Cookie,
  Brain,
  Sparkles,
  Shirt,
  type LucideIcon,
} from "lucide-react";

const map: Record<string, LucideIcon> = {
  Activity,
  HeartPulse,
  Scale,
  BatteryLow,
  Wind,
  Cookie,
  Brain,
  Sparkles,
  Shirt,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = map[name] ?? Sparkles;
  return <Cmp className={className} />;
}
