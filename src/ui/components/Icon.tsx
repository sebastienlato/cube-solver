import type { ReactNode } from 'react'

const PATHS = {
  play: (
    <path
      d="M8 5.5v13a1 1 0 0 0 1.53.85l10.2-6.5a1 1 0 0 0 0-1.7L9.53 4.65A1 1 0 0 0 8 5.5Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.5" y="5" width="4" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  previous: (
    <>
      <path d="M6 5v14" />
      <path
        d="M18 6.2v11.6a.8.8 0 0 1-1.24.67L9 13.1a1.3 1.3 0 0 1 0-2.2l7.76-5.37A.8.8 0 0 1 18 6.2Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  next: (
    <>
      <path d="M18 5v14" />
      <path
        d="M6 6.2v11.6a.8.8 0 0 0 1.24.67L15 13.1a1.3 1.3 0 0 0 0-2.2L7.24 5.53A.8.8 0 0 0 6 6.2Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  restart: (
    <>
      <path d="M4.5 12a7.5 7.5 0 1 0 2.3-5.4" />
      <path d="M4.5 4.5v4h4" />
    </>
  ),
  back: <path d="M14.5 5.5 8 12l6.5 6.5" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  alert: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v5.5" />
      <path d="M12 16.2v.3" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.3-2h6.4l1.3 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="12" cy="13" r="3.4" />
    </>
  ),
  flip: (
    <>
      <path d="M4 9.5A6.5 6.5 0 0 1 15.6 6L18 8" />
      <path d="M18 4v4h-4" />
      <path d="M20 14.5A6.5 6.5 0 0 1 8.4 18L6 16" />
      <path d="M6 20v-4h4" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.5V5" />
      <path d="m7.5 9.5 4.5-4.5 4.5 4.5" />
      <path d="M5 15.5v2A1.5 1.5 0 0 0 6.5 19h11a1.5 1.5 0 0 0 1.5-1.5v-2" />
    </>
  ),
  view: (
    <>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

/** Decorative by default: the control it sits in carries the label. */
export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PATHS[name]}
    </svg>
  )
}
