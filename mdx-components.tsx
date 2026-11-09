import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: ({ children }) => <h1 tabIndex={-1}>{children}</h1>,
  a: ({ href, children, ...props }) => {
    const target = href.startsWith("#") ? "_self" : "_blank";
    return (
      <a {...props} href={href} target={target}>
        {children}
      </a>
    );
  },
  table: ({ children, ...props }) => (
    <table {...props} className="border-1 border-black-default">
      {children}
    </table>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="border-1 border-black-default p-2">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border-1 border-black-default p-2">
      {children}
    </td>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
