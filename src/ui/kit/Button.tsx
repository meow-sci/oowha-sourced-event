import { Button as AriaButton, composeRenderProps, type ButtonProps } from 'react-aria-components';
import { tv, type VariantProps } from 'tailwind-variants';
import { focusRing } from './styles';

const button = tv({
  base: `inline-flex cursor-default select-none items-center justify-center gap-2 rounded-lg border font-semibold transition disabled:pointer-events-none disabled:opacity-40 ${focusRing}`,
  variants: {
    variant: {
      primary:
        'border-accent bg-accent px-4 py-2 text-accent-fg hover:bg-accent-hover pressed:translate-y-px',
      secondary:
        'border-border-strong bg-panel-raised px-4 py-2 text-fg hover:border-fg-subtle hover:bg-wash-hover',
      ghost:
        'border-transparent bg-transparent px-3 py-2 text-fg-muted hover:bg-wash-hover hover:text-fg',
      danger: 'border-danger/50 bg-danger/15 px-4 py-2 text-danger hover:bg-danger/25',
    },
    size: { sm: 'min-h-8 text-xs', md: 'min-h-10 text-sm' },
  },
  defaultVariants: { variant: 'secondary', size: 'md' },
});

export interface AppButtonProps extends ButtonProps, VariantProps<typeof button> {}

export function Button({ variant, size, className, ...props }: AppButtonProps) {
  return (
    <AriaButton
      {...props}
      className={composeRenderProps(className, (resolved, state) =>
        button({ variant, size, ...state, className: resolved }),
      )}
    />
  );
}
