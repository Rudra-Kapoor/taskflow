import { createElement, isValidElement } from 'react';

/** Renders an icon given either a component (e.g. lucide `Folder`) or a ready-made element. */
export function renderIcon(icon, className) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  return createElement(icon, { className, 'aria-hidden': 'true' });
}
