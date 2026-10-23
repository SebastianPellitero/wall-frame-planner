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

/** Two sliders. */
export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
    <circle cx="15" cy="8" r="2" />
    <circle cx="9" cy="16" r="2" />
  </Icon>
);

/** An arrow up out of a tray. */
export const UploadIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 15V4.5M7.5 9 12 4.5 16.5 9" />
    <path d="M4.5 14.5v3A2 2 0 0 0 6.5 19.5h11a2 2 0 0 0 2-2v-3" />
  </Icon>
);

export const EyeIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

/** The eye, struck through. */
export const EyeOffIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.6 3.4M6.6 6.9C4 8.6 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.9-1.4" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    <path d="M3.5 3.5l17 17" />
  </Icon>
);

/** A warning triangle: error toasts. */
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.2 2.8 17.5A2 2 0 0 0 4.5 20.5h15a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4.5M12 17.2v.1" />
  </Icon>
);

/** An i in a circle: info toasts. */
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.8v.1" />
  </Icon>
);

/** A landscape picture: a rectangle with a small peak and a sun. */
export const ImageIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
    <path d="M3.5 16.5 9 11l4.5 4.5 2-2 5 5" />
    <circle cx="15.5" cy="9.5" r="1.5" />
  </Icon>
);

/** The picture with a plus at its lower right: Add photo to frame. */
export const ImageAddIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 18.5H5a1.5 1.5 0 0 1-1.5-1.5V7A1.5 1.5 0 0 1 5 5.5h14A1.5 1.5 0 0 1 20.5 7v6" />
    <path d="M3.5 16 9 10.5l4 4" />
    <circle cx="15.5" cy="9.5" r="1.5" />
    <path d="M19 15.5v6M16 18.5h6" />
  </Icon>
);

/** Two interlocking L-brackets, square ends: Adjust frame photo. */
export const CropIcon = (p: IconProps) => (
  <Icon {...p} square>
    <path d="M7 3v14h14" />
    <path d="M3 7h14v14" />
  </Icon>
);

/** A square outline with a second square inset 4 units: frame plus mat (Mat on). */
export const MatIcon = (p: IconProps) => (
  <Icon {...p} square>
    <rect x="4" y="4" width="16" height="16" />
    <rect x="8" y="8" width="8" height="8" />
  </Icon>
);

/** A square outline with a square inset 1.5 units: the photo to the edge (Mat off). */
export const MatOffIcon = (p: IconProps) => (
  <Icon {...p} square>
    <rect x="4" y="4" width="16" height="16" />
    <rect x="5.5" y="5.5" width="13" height="13" />
  </Icon>
);

/** A horizontal bar with four ticks: the Size tab. */
export const RulerIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="2.5" y="8" width="19" height="8" rx="1" />
    <path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
);

/** An eyedropper at 45°: the Custom wall color. */
export const DropperIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14.5 5.5l4 4M16.5 3.5a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3l-2 2-4-4 2-2z" />
    <path d="M13.5 8.5l-8 8V20h3.5l8-8" />
  </Icon>
);
