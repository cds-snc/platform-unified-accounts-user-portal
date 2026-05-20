export const ArrowRightSelector = ({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    focusable="false"
    aria-hidden={title ? false : true}
    role={title ? "img" : "presentation"}
    className={className}
  >
    {title && <title>{title}</title>}
    <path
      d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"
      fill="currentColor"
    />
  </svg>
);
