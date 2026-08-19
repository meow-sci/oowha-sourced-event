import {
  ArrowRight,
  Check,
  Database,
  FileInput,
  LockKeyhole,
  ScrollText,
  ShieldCheck,
} from 'lucide-react';
import { cn } from './kit';

const nodes = [
  { title: 'API entry', detail: 'typed request', icon: FileInput },
  { title: 'Command', detail: 'orchestrates', icon: ScrollText },
  { title: 'Query', detail: 'reads projection', icon: LockKeyhole },
  { title: 'Security gate', detail: 'allow / deny', icon: ShieldCheck },
  { title: 'One transaction', detail: 'append + project', icon: Database },
  { title: 'Committed', detail: 'read model ready', icon: Check },
] as const;

export function FlowDiagram({ activeStep, denied }: { activeStep: number; denied: boolean }) {
  return (
    <div
      className="grid grid-cols-[1fr_auto_1fr] gap-2 lg:grid-cols-[repeat(11,minmax(0,1fr))]"
      aria-label="Command processing flow"
    >
      {nodes.map((node, index) => {
        const Icon = node.icon;
        const active = index === activeStep;
        const complete = index < activeStep;
        return (
          <div key={node.title} className="contents">
            <div
              className={cn(
                'col-span-1 flex min-h-24 flex-col items-center justify-center rounded-xl border p-3 text-center transition-all lg:col-span-1',
                active && 'border-accent bg-accent/10 shadow-[0_0_32px_rgb(44_250_31_/_0.12)]',
                complete && 'border-accent/40 bg-panel-raised',
                !active && !complete && 'border-border bg-panel-sunken text-fg-muted',
                denied && index > 3 && 'opacity-30',
              )}
            >
              <Icon size={20} className={active || complete ? 'text-accent' : 'text-fg-subtle'} />
              <span className="mt-2 text-xs font-bold text-fg">{node.title}</span>
              <span className="mt-0.5 text-[10px] text-fg-subtle">{node.detail}</span>
            </div>
            {index < nodes.length - 1 && (
              <ArrowRight
                size={15}
                className="self-center justify-self-center text-fg-subtle"
                aria-hidden="true"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
