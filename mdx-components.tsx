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
  p: ({ children, ...props }) => (
    <p {...props} className="pb-4">
      {children}
    </p>
  ),
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
  ul: ({ children, ...props }) => (
    <ul {...props} className="pb-4">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="pb-4">
      {children}
    </ol>
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
