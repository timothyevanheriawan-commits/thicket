// A smaller, two-leaf variant of the LeafTrio brand mark — sits inline
// beside the "Thicket" wordmark in the header (Direction A: "field
// notebook margin"). Deliberately simpler than LeafTrio (2 leaves, no
// stem dot) so it reads as a margin doodle, not a repeated logo.
export default function Sprig({
  size = 22,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 30 30"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <g transform="translate(15,26) rotate(-18)">
        <path
          d="M0,0 C-4,-4 -3.8,-11 0,-15 C3.8,-11 4,-4 0,0 Z"
          className="fill-sage/50"
        />
      </g>
      <g transform="translate(15,26) rotate(14)">
        <path
          d="M0,0 C-4,-4 -3.8,-11 0,-15 C3.8,-11 4,-4 0,0 Z"
          className="fill-sage-deep/55"
        />
      </g>
    </svg>
  );
}
