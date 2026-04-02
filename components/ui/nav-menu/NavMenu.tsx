import React, { type ReactNode } from "react";

export const NavMenu = ({ children }: { children?: ReactNode }) => {
  // This felt cleaner than receiving an array of elements where each element
  // would require a key="VALUE" prop..
  const items = React.Children.toArray(children);

  if (items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Menu">
      <ul className="flex list-none items-center justify-end gap-4">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </nav>
  );
};
