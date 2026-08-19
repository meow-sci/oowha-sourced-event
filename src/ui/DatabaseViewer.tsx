import { useEffect, useRef, useState } from 'react';
import { Database, GripHorizontal, RefreshCw, X } from 'lucide-react';
import type { DemoDatabase } from '../database/types';
import { displayCell, inspectDatabase, type TableData } from '../database/inspect';
import { Button, cn } from './kit';

interface Position {
  x: number;
  y: number;
}

export function DatabaseViewer({
  database,
  revision,
  onClose,
}: {
  database: DemoDatabase;
  revision: number;
  onClose(): void;
}) {
  const [tables, setTables] = useState<TableData[]>([]);
  const [selectedTable, setSelectedTable] = useState('event_log');
  const [position, setPosition] = useState<Position>({ x: 36, y: 110 });
  const [loading, setLoading] = useState(true);
  const dragOrigin = useRef<{ pointerX: number; pointerY: number; position: Position } | null>(
    null,
  );

  const refresh = async () => {
    setLoading(true);
    const next = await inspectDatabase(database);
    setTables(next);
    if (!next.some((table) => table.name === selectedTable)) setSelectedTable(next[0]?.name ?? '');
    setLoading(false);
  };

  useEffect(() => {
    let active = true;
    void inspectDatabase(database).then((next) => {
      if (!active) return;
      setTables(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [database, revision]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as Element).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOrigin.current = { pointerX: event.clientX, pointerY: event.clientY, position };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const origin = dragOrigin.current;
    if (!origin) return;
    setPosition({
      x: Math.max(0, origin.position.x + event.clientX - origin.pointerX),
      y: Math.max(0, origin.position.y + event.clientY - origin.pointerY),
    });
  };
  const selected = tables.find((table) => table.name === selectedTable);

  return (
    <section
      role="dialog"
      aria-label="Raw database table viewer"
      className="fixed z-40 flex h-[min(65vh,620px)] w-[min(78vw,980px)] min-w-80 resize flex-col overflow-hidden rounded-2xl border border-border-strong bg-panel/98 shadow-popover backdrop-blur-xl"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex h-11 shrink-0 cursor-grab touch-none select-none items-center gap-2 border-b border-border bg-panel-raised px-3 active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={() => {
          dragOrigin.current = null;
        }}
      >
        <GripHorizontal size={16} className="text-fg-subtle" />
        <Database size={16} className="text-accent" />
        <h2 className="flex-1 text-sm font-bold">Raw Turso tables</h2>
        <span className="text-[10px] uppercase tracking-widest text-fg-subtle">
          drag · resize corner
        </span>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Refresh tables"
          onPress={() => void refresh()}
        >
          <RefreshCw size={14} />
        </Button>
        <Button variant="ghost" size="sm" aria-label="Close database viewer" onPress={onClose}>
          <X size={15} />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav
          className="w-44 shrink-0 overflow-y-auto border-r border-border bg-panel-sunken p-2"
          aria-label="Database tables"
        >
          {tables.map((table) => (
            <Button
              key={table.name}
              variant="ghost"
              size="sm"
              className={cn(
                'mb-1 w-full justify-between font-mono',
                selectedTable === table.name && 'bg-accent/10 text-accent',
              )}
              onPress={() => setSelectedTable(table.name)}
            >
              <span className="truncate">{table.name}</span>
              <span className="text-fg-subtle">{table.totalRows}</span>
            </Button>
          ))}
        </nav>
        <div className="min-w-0 flex-1 overflow-auto">
          {loading ? (
            <p className="p-6 text-sm text-fg-muted">Reading Turso…</p>
          ) : selected ? (
            <table className="w-full border-collapse font-mono text-[11px]">
              <thead className="sticky top-0 z-10 bg-panel-raised">
                <tr>
                  {selected.columns.map((column) => (
                    <th
                      key={column}
                      className="whitespace-nowrap border-b border-r border-border px-3 py-2 text-left text-fg-muted"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.rows.map((row, rowIndex) => (
                  <tr
                    key={`${selected.name}-${rowIndex}`}
                    className="odd:bg-white/[0.015] hover:bg-wash-hover"
                  >
                    {selected.columns.map((column) => (
                      <td
                        key={column}
                        className="max-w-72 truncate whitespace-nowrap border-b border-r border-border/60 px-3 py-2"
                        title={displayCell(row[column])}
                      >
                        {displayCell(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-6 text-sm text-fg-muted">No projection tables currently exist.</p>
          )}
        </div>
      </div>
    </section>
  );
}
