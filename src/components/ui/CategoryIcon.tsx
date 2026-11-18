import {
  BookOpen,
  Briefcase,
  Bus,
  Coffee,
  Film,
  GraduationCap,
  HeartHandshake,
  Home,
  MoreHorizontal,
  PlusCircle,
  ShoppingBag,
  SlidersHorizontal,
  Utensils,
  Wifi,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  Utensils,
  Coffee,
  Bus,
  Home,
  Wifi,
  BookOpen,
  ShoppingBag,
  Film,
  MoreHorizontal,
  HeartHandshake,
  Briefcase,
  GraduationCap,
  PlusCircle,
  SlidersHorizontal,
};

const VALID_TONES = new Set([
  'makan',
  'transport',
  'jajan',
  'kosan',
  'paketan',
  'kuliah',
  'belanja',
  'hiburan',
  'lainnya',
]);

interface CategoryIconProps {
  iconName?: string;
  tone?: string;
  size?: number;
}

export function CategoryIcon({
  iconName = 'MoreHorizontal',
  tone = 'lainnya',
  size = 40,
}: CategoryIconProps) {
  const IconComponent = ICON_MAP[iconName] ?? MoreHorizontal;
  const safeTone = VALID_TONES.has(tone) ? tone : 'lainnya';

  return (
    <span
      aria-hidden="true"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${size / 2}px`,
        backgroundColor: `var(--tone-${safeTone}-bg)`,
        color: `var(--tone-${safeTone}-ink)`,
      }}
      className="inline-flex shrink-0 items-center justify-center"
    >
      <IconComponent size={Math.round(size * 0.48)} strokeWidth={2.2} />
    </span>
  );
}
