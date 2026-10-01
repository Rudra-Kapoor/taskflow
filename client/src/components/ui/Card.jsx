import { cn } from '@/lib/cn';

/** Flat surface (rounded-xl, 1px hairline, no shadow). `padding={false}` for flush content. */
export function Card({ as: Component = 'div', padding = true, className, children, ...props }) {
  return (
    <Component className={cn('card', padding && 'p-4 sm:p-5', className)} {...props}>
      {children}
    </Component>
  );
}
