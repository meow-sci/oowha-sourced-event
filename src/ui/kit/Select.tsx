import { Check, ChevronDown } from 'lucide-react';
import {
  Button,
  Label,
  ListBox,
  ListBoxItem,
  Popover,
  Select as AriaSelect,
  SelectValue,
  type Key,
} from 'react-aria-components';
import { focusRing } from './styles';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface AppSelectProps<T extends string> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange(value: T): void;
}

export function Select<T extends string>({ label, value, options, onChange }: AppSelectProps<T>) {
  const handleChange = (key: Key | null) => {
    if (key !== null) onChange(String(key) as T);
  };
  return (
    <AriaSelect
      selectedKey={value}
      onSelectionChange={handleChange}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <Label className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">
        {label}
      </Label>
      <Button
        className={`flex min-h-10 items-center justify-between gap-4 rounded-lg border border-border-strong bg-panel-sunken px-3 text-left text-sm text-fg hover:border-fg-subtle ${focusRing}`}
      >
        <SelectValue className="truncate" />
        <ChevronDown size={15} className="shrink-0 text-fg-muted" />
      </Button>
      <Popover className="z-50 min-w-[var(--trigger-width)] rounded-xl border border-border-strong bg-panel-raised p-1 shadow-popover">
        <ListBox className="outline-none">
          {options.map((option) => (
            <ListBoxItem
              id={option.value}
              key={option.value}
              textValue={option.label}
              className="group flex cursor-default items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm text-fg outline-none hover:bg-wash-hover focus:bg-wash-hover selected:bg-accent/10 selected:text-accent"
            >
              {option.label}
              <Check size={14} className="invisible group-selected:visible" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
