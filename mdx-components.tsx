import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: ({ children }) => <h1 tabIndex={-1}>{children}</h1>,
  a: ({ href, children }) => {
    const target = href.startsWith("#") ? "_self" : "_blank";
    return <a target={target}>{children}</a>;
  },
  table: ({ children }) => <table className="border-1 border-black-default">{children}</table>,
  th: ({ children }) => <th className="border-1 border-black-default p-2">{children}</th>,
  td: ({ children }) => <td className="border-1 border-black-default p-2">{children}</td>,
};

export function useMDXComponents(): MDXComponents {
  return components;
}
