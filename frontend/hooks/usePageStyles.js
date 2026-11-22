import { useEffect } from 'react';

/**
 * Page-specific stylesheets from the old site (signin.css, account.css, ...) contain
 * global html/body/:root rules. In an SPA a normal `import './x.css'` would keep them
 * active on every route, so they are imported with `?inline` and mounted/unmounted
 * with the page instead.
 *
 * Pass a module-level array so its identity is stable.
 */
export default function usePageStyles(cssTexts) {
  useEffect(() => {
    const nodes = cssTexts.map((css) => {
      const el = document.createElement('style');
      el.setAttribute('data-page-style', '');
      el.textContent = css;
      document.head.appendChild(el);
      return el;
    });
    return () => nodes.forEach((el) => el.remove());
  }, [cssTexts]);
}
