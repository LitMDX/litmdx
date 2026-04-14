import React from 'react';

/**
 * MDX override for <img> elements.
 *
 * Adds `loading="lazy"` and `decoding="async"` to every image rendered from
 * MDX content. This improves Core Web Vitals by:
 *
 * - Deferring off-screen image loads (reduces initial bandwidth, improves LCP
 *   by unblocking the critical render path).
 * - Performing image decoding off the main thread (`decoding="async"`), which
 *   reduces main-thread work and improves INP.
 *
 * Explicit `loading` or `decoding` attributes set by the author take precedence
 * via the rest spread.
 */
export function MdxImage({
  src,
  alt,
  loading = 'lazy',
  decoding = 'async',
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  return <img src={src} alt={alt ?? ''} loading={loading} decoding={decoding} {...props} />;
}
