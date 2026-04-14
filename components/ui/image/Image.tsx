/*--------------------------------------------*
 * Framework and Third-Party
 *--------------------------------------------*/
import NextImage, { type ImageProps } from "next/image";

// This component is a simple wrapper around Next.js's Image component. It adds
// a `color: ""` style prop which removes the default `style=color:transparent`
// attribute added to all <img> tags by Next.js.
export function Image({ style, ...props }: ImageProps) {
  return <NextImage style={{ color: "", ...style }} {...props} />;
}
