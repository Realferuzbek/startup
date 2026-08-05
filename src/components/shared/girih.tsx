import { cn } from "@/lib/utils";

type GirihProps = {
  /** Rendered width/height in px. */
  size?: number;
  /** Stroke width in CSS px (constant at any size — non-scaling). */
  strokeWidth?: number;
  className?: string;
  /**
   * When provided the mark is exposed to assistive tech (role="img" + label);
   * otherwise it is decorative and aria-hidden.
   */
  label?: string;
};

/*
  The girih signature — an eight-pointed star, the geometry underlying Central
  Asian panjara screens. Drawn as the OUTLINE of the star ONLY: a single closed
  path of 16 vertices alternating outer point → inner valley. The earlier version
  stroked two whole overlapping squares, whose interior crossings visually filled
  in at small sizes (the 14px verified badge read as a blob). Removing every
  interior segment keeps the star legible at every size.

  Geometry — viewBox 0 0 24 24, center (12,12), outer radius R = 10:
    · 8 outer points at radius 10, every 45° (on axes + diagonals).
    · 8 inner valleys 22.5° between them, where an edge of one square meets an
      edge of the other. That intersection (e.g. diamond edge x−y=10 ∩ rect edge
      y=4.92893) lands at (14.92893, 4.92893), a distance r = √(2−√2)·R ≈
      0.765367·R = 7.653669 from the center — matching the classic ≈0.765×R.
  Coordinates were derived (not eyeballed) and cross-checked two ways: the polar
  reconstruction of all 16 vertices, and the edge-intersection above.

  Stroke-only, currentColor, so context (registry or verified) sets the color.
  It appears in exactly three places — verification mark, empty states, loading
  lattices — and nowhere else. Scarcity is its power.
*/
export function Girih({
  size = 24,
  strokeWidth = 1.5,
  className,
  label,
}: GirihProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinejoin="miter"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {label ? <title>{label}</title> : null}
      <path
        d="M12 2 L14.92893 4.92893 L19.07107 4.92893 L19.07107 9.07107 L22 12 L19.07107 14.92893 L19.07107 19.07107 L14.92893 19.07107 L12 22 L9.07107 19.07107 L4.92893 19.07107 L4.92893 14.92893 L2 12 L4.92893 9.07107 L4.92893 4.92893 L9.07107 4.92893 Z"
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
