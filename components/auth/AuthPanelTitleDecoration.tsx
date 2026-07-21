export const LeftIcon = ({ className, title }: { className?: string; title?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={31}
    height={39}
    focusable="false"
    aria-hidden={title ? false : true}
    role={title ? "img" : "presentation"}
  >
    {title && <title>{title}</title>}
    <path
      stroke="#6366F1"
      strokeLinecap="round"
      strokeWidth={4}
      d="m2.828 27.125 8.797 8.797M6.703 23.25l8.797 8.797"
    />
    <circle cx={23.25} cy={7.75} r={5.75} fill="#EEF2FF" stroke="#6366F1" strokeWidth={4} />
  </svg>
);

export const RightIcon = ({ className, title }: { className?: string; title?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    width={31}
    height={39}
    focusable="false"
    aria-hidden={title ? false : true}
    role={title ? "img" : "presentation"}
  >
    {title && <title>{title}</title>}
    <path
      stroke="#6366F1"
      strokeLinecap="round"
      strokeWidth={4}
      d="m28.172 27.125-8.797 8.796M24.297 23.25 15.5 32.046"
    />
    <circle
      cx={7.75}
      cy={7.75}
      r={5.75}
      fill="#EEF2FF"
      stroke="#6366F1"
      strokeWidth={4}
      transform="matrix(-1 0 0 1 15.5 0)"
    />
  </svg>
);