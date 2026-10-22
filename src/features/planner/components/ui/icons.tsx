import type { ReactNode } from "react";

/**
 * design-system.md §5: 24-unit viewBox, 1.75 currentColor stroke, round caps and joins (square
 * for the shape glyphs). 20px in icon buttons, 18px next to text.
 */
function Icon({ size = 20, className, square, children }: { size?: 18 | 20; className?: string; square?: boolean; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap={square ? "square" : "round"}
      strokeLinejoin={square ? "miter" : "round"}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

type IconProps = { size?: 18 | 20; className?: string };

/** Three small frames. */
export const ArrangeIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4" width="7.5" height="10" />
    <rect x="13.5" y="4" width="7" height="6" />
    <rect x="13.5" y="12.5" width="7" height="7.5" />
    <rect x="3.5" y="16.5" width="7.5" height="3.5" />
  </Icon>
);

export const PhotoIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m21 15.5-4.5-4.5L7 19" />
  </Icon>
);

/** A grid corner with a crosshair on its origin. */
export const OriginIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M8 21V8h13" />
    <path d="M14.5 8v13M8 14.5h13" />
    <path d="M8 3v3M3 8h3" />
  </Icon>
);

export const RotateIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="9" y="11" width="12" height="8" rx="1.5" />
    <path d="M17 7.5A8 8 0 0 0 4 9.5" />
    <path d="M3 5v4.5h4.5" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

/** Shape glyphs (§5): a frame and its opening, square-joined like the frames. A 12×16 portrait rectangle. */
export const ShapeRectIcon = (p: IconProps) => (
  <Icon {...p} square>
    <rect x="6" y="4" width="12" height="16" />
    <rect x="9" y="7.5" width="6" height="9" />
  </Icon>
);

/** 14×14. */
export const ShapeSquareIcon = (p: IconProps) => (
  <Icon {...p} square>
    <rect x="5" y="5" width="14" height="14" />
    <rect x="8.5" y="8.5" width="7" height="7" />
  </Icon>
);

/** Diameter 15. */
export const ShapeCircleIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="4" />
  </Icon>
);

/** Two overlapping frames: the copy in front. */
export const DuplicateIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8.5" y="8.5" width="11.5" height="11.5" rx="1.5" />
    <path d="M15.5 5.5V5A1.5 1.5 0 0 0 14 3.5H5A1.5 1.5 0 0 0 3.5 5v9A1.5 1.5 0 0 0 5 15.5h.5" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6.5h16" />
    <path d="M9.5 6.5V4.5h5v2" />
    <path d="M6 6.5l1 13.5h10l1-13.5" />
    <path d="M10 10.5v6M14 10.5v6" />
  </Icon>
);

export const UndoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4.5 4.5 9 9 13.5" />
    <path d="M4.5 9H15a5 5 0 0 1 0 10h-4" />
  </Icon>
);

export const RedoIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M15 4.5 19.5 9 15 13.5" />
    <path d="M19.5 9H9a5 5 0 0 0 0 10h4" />
  </Icon>
);
