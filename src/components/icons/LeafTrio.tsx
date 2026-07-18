// Reuses the leaf-trio brand mark (see icon.svg) as a small inline icon for
// empty states — uses the app's existing color tokens (sage/sage-deep/clay)
// via fill-* utilities so it matches the palette without hardcoding hex.
export default function LeafTrio({
  size = 40,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(32,50)">
        <g transform="rotate(-26)">
          <path
            d="M0,0 C -8.5,-7.4 -7.7,-22.2 0,-29.6 C 7.7,-22.2 8.5,-7.4 0,0 Z"
            className="fill-sage/50"
          />
        </g>
        <g transform="rotate(26)">
          <path
            d="M0,0 C -8.5,-7.4 -7.7,-22.2 0,-29.6 C 7.7,-22.2 8.5,-7.4 0,0 Z"
            className="fill-sage-deep/55"
          />
        </g>
        <g transform="rotate(0)">
          <path
            d="M0,0 C -9,-8 -8.5,-24.5 0,-33 C 8.5,-24.5 9,-8 0,0 Z"
            className="fill-clay/60"
          />
        </g>
        <circle cx="0" cy="2" r="2" className="fill-brown/40" />
      </g>
    </svg>
  );
}
