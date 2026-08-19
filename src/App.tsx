import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Boxes,
  Database,
  FlaskConical,
  History,
  PackageOpen,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import type { CommandHandlingSession } from './commands/processCommand';
import type { AuthorizationDecision } from './queries/securityQueries';
import type { DemoSnapshot, DemoRuntime } from './demo/runtime';
import { getRuntime } from './demo/runtime';
import { commandForScenario, DEMO_USER_IDS, GAME_NAME, type DemoScenario } from './demo/scenario';
import { generateLoad, type LoadProgress } from './demo/loadGenerator';
import { describeCommand } from './domain/commands';
import { DatabaseViewer } from './ui/DatabaseViewer';
import { FlowDiagram } from './ui/FlowDiagram';
import { Button, cn, Select } from './ui/kit';

interface Walkthrough {
  session: CommandHandlingSession;
  step: number;
  decision?: AuthorizationDecision;
  result?: string;
}

const scenarioOptions = [
  { value: 'allowed-package', label: 'Allowed: owner creates package' },
  { value: 'denied-package', label: 'Denied: purchaser creates package' },
  { value: 'grant-purchase', label: 'Allowed: owner grants purchase' },
  { value: 'add-chunk', label: 'Allowed: owner adds chunk' },
] satisfies { value: DemoScenario; label: string }[];

const userOptions = DEMO_USER_IDS.map((userId) => ({ value: userId, label: userId }));

const stepCopy = [
  [
    'POST /commands',
    'The typed API adapter accepts the request and opens a command-handling session.',
  ],
  [
    'Command processor',
    'Business orchestration identifies the projection query required for this command.',
  ],
  [
    'Projection query',
    'The query module reads user_permissions and related game/package projections.',
  ],
  ['Security gate', 'A denied command stops here; no event or projection row can be written.'],
  [
    'Atomic transaction',
    'One Turso transaction appends event_log and invokes every active projection handler.',
  ],
  ['Committed', 'The event and read-model changes become visible together.'],
] as const;

export default function App() {
  const [runtime, setRuntime] = useState<DemoRuntime>();
  const [snapshot, setSnapshot] = useState<DemoSnapshot>();
  const [scenario, setScenario] = useState<DemoScenario>('allowed-package');
  const [walkthrough, setWalkthrough] = useState<Walkthrough>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('Opening the persistent OPFS database…');
  const [viewerOpen, setViewerOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [loadCount, setLoadCount] = useState(250);
  const [loadProgress, setLoadProgress] = useState<LoadProgress>();
  const [queryUser, setQueryUser] = useState<(typeof DEMO_USER_IDS)[number]>('user2');
  const [queryResult, setQueryResult] = useState('Choose a query to read only from projections.');

  useEffect(() => {
    void getRuntime()
      .then(async (nextRuntime) => {
        setRuntime(nextRuntime);
        setSnapshot(await nextRuntime.snapshot());
        setMessage('Ready. The database persists locally in this browser.');
      })
      .catch((error: unknown) => setMessage(errorMessage(error)));
  }, []);

  const refresh = async (nextRuntime = runtime) => {
    if (!nextRuntime) return;
    setSnapshot(await nextRuntime.snapshot());
    setRevision((value) => value + 1);
  };

  const startWalkthrough = () => {
    if (!runtime || snapshot?.projectionVersion === 'none') return;
    const command = commandForScenario(scenario);
    setWalkthrough({ session: runtime.commands.beginRequest(command), step: 0 });
    setMessage('Request received. Use Next step to move through the real pipeline.');
  };

  const nextStep = async () => {
    if (!walkthrough) return;
    setBusy(true);
    try {
      if (walkthrough.step === 1) {
        const decision = await walkthrough.session.authorize();
        setWalkthrough({ ...walkthrough, decision, step: 2 });
      } else if (walkthrough.step === 3) {
        if (!walkthrough.decision?.allowed) {
          setWalkthrough({
            ...walkthrough,
            step: 5,
            result: 'Denied before the transaction: event_log is unchanged.',
          });
          setMessage(
            'Authorization denied the command. No transaction opened and no rows changed.',
          );
        } else {
          const result = await walkthrough.session.commit();
          setWalkthrough({
            ...walkthrough,
            step: 4,
            result: `Committed ${result.event.type} as event #${result.sequence}.`,
          });
          await refresh();
        }
      } else if (walkthrough.step < 5) {
        setWalkthrough({ ...walkthrough, step: walkthrough.step + 1 });
      }
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const projectionAction = async (action: 'drop' | 'v1' | 'v2' | 'reset') => {
    if (!runtime) return;
    setBusy(true);
    setWalkthrough(undefined);
    try {
      if (action === 'drop') await runtime.dropProjections();
      else if (action === 'reset') await runtime.reset();
      else await runtime.rebuild(action);
      await refresh();
      setMessage(
        action === 'drop'
          ? 'Projection tables dropped. The event log is untouched.'
          : action === 'reset'
            ? 'Demo reset and seeded with twelve domain events.'
            : `${action.toUpperCase()} rebuilt entirely from the event log.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const runLoad = async () => {
    if (!runtime || snapshot?.projectionVersion === 'none') return;
    setBusy(true);
    setLoadProgress({ completed: 0, total: loadCount, elapsedMs: 0 });
    try {
      await generateLoad(runtime.commands, loadCount, setLoadProgress);
      await refresh();
      setMessage(
        `Generated ${loadCount.toLocaleString()} authorized commands through the same command pipeline.`,
      );
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const runQuery = async (kind: 'games' | 'chunks') => {
    if (!runtime || snapshot?.projectionVersion === 'none') return;
    try {
      if (kind === 'games') {
        const games = await runtime.queries.getGames(queryUser);
        setQueryResult(JSON.stringify(games, null, 2));
      } else {
        const chunks = await runtime.queries.getGameChunks(queryUser, GAME_NAME);
        setQueryResult(JSON.stringify(chunks, null, 2));
      }
    } catch (error) {
      setQueryResult(errorMessage(error));
    }
  };

  if (!runtime || !snapshot) return <LoadingScreen message={message} />;
  const projectionsAvailable = snapshot.projectionVersion !== 'none';
  const currentStep = walkthrough?.step ?? 0;
  const denied = walkthrough?.decision?.allowed === false;
  const displayedStep = denied && currentStep === 5 ? 3 : currentStep;

  return (
    <div className="min-h-screen bg-canvas text-fg">
      <header className="border-b border-border bg-panel/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-5 py-4 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-accent">
              <FlaskConical size={21} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Oowha! Sourced Event</h1>
              <p className="text-xs text-fg-muted">
                A whole event-sourced system, inside your browser
              </p>
            </div>
          </div>
          <StatusPill icon={Database} label="Turso OPFS" value="persistent" />
          <StatusPill
            icon={History}
            label="Event log"
            value={`${snapshot.eventCount.toLocaleString()} events`}
          />
          <StatusPill
            icon={Boxes}
            label="Projection"
            value={snapshot.projectionVersion.toUpperCase()}
            warning={!projectionsAvailable}
          />
          <Button variant="secondary" onPress={() => setViewerOpen(true)}>
            <Database size={16} /> Browse tables
          </Button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.7fr)] lg:px-8">
        <section className="min-w-0 rounded-2xl border border-border bg-panel p-5 shadow-card lg:p-6">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Interactive walkthrough</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Follow one command</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-fg-muted">
                Every highlighted step corresponds to a clean module boundary. The database changes
                only at the atomic transaction step.
              </p>
            </div>
            <div className="w-full max-w-sm">
              <Select<DemoScenario>
                label="Command scenario"
                value={scenario}
                options={scenarioOptions}
                onChange={setScenario}
              />
            </div>
          </div>

          <FlowDiagram activeStep={displayedStep} denied={denied} />

          <div
            className={cn(
              'mt-5 rounded-xl border p-4',
              denied ? 'border-danger/40 bg-danger/10' : 'border-border-strong bg-panel-sunken',
            )}
          >
            {walkthrough ? (
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] font-bold text-accent">
                      STEP {displayedStep + 1}/6
                    </span>
                    <h3 className="font-bold">
                      {denied && currentStep === 5
                        ? 'Denied — no transaction'
                        : stepCopy[currentStep][0]}
                    </h3>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-fg-muted">
                    {walkthrough.result ??
                      walkthrough.decision?.explanation ??
                      stepCopy[currentStep][1]}
                  </p>
                  <code className="mt-2 block truncate text-xs text-fg-subtle">
                    {describeCommand(walkthrough.session.command)}
                  </code>
                </div>
                {currentStep < 5 && (
                  <Button variant="primary" isDisabled={busy} onPress={() => void nextStep()}>
                    Next step <ArrowRight size={16} />
                  </Button>
                )}
                {currentStep === 5 && (
                  <Button onPress={startWalkthrough}>
                    <RotateCcw size={15} /> New run
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1">
                  <h3 className="font-bold">Ready to trace a real command</h3>
                  <p className="mt-1 text-sm text-fg-muted">
                    Choose an allowed or denied case, then move through it one boundary at a time.
                  </p>
                </div>
                <Button
                  variant="primary"
                  isDisabled={!projectionsAvailable}
                  onPress={startWalkthrough}
                >
                  <Play size={16} /> Start walkthrough
                </Button>
              </div>
            )}
          </div>
        </section>

        <aside className="flex min-w-0 flex-col gap-5">
          <Panel title="Projection laboratory" eyebrow="Replay, don't migrate">
            <p className="text-sm leading-6 text-fg-muted">
              Drop disposable read models while retaining all {snapshot.eventCount.toLocaleString()}{' '}
              source events, then replay into a different feature set.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                isDisabled={busy || !projectionsAvailable}
                onPress={() => void projectionAction('drop')}
              >
                <Trash2 size={15} /> Drop
              </Button>
              <Button isDisabled={busy} onPress={() => void projectionAction('reset')}>
                <RotateCcw size={15} /> Reset demo
              </Button>
              <Button isDisabled={busy} onPress={() => void projectionAction('v1')}>
                Rebuild V1
              </Button>
              <Button
                variant="primary"
                isDisabled={busy}
                onPress={() => void projectionAction('v2')}
              >
                Rebuild V2
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              <Metric label="users" value={snapshot.users} icon={Users} />
              <Metric label="games" value={snapshot.games} icon={ShieldCheck} />
              <Metric label="packages" value={snapshot.packages} icon={PackageOpen} />
              <Metric label="chunks" value={snapshot.chunks} icon={Boxes} />
            </div>
            <div className="mt-3 rounded-lg border border-border bg-panel-sunken p-3 text-xs text-fg-muted">
              <strong className="text-fg">V1</strong> domain tables ·{' '}
              <strong className="text-fg">V2</strong> domain tables + user action audit
            </div>
          </Panel>

          <Panel title="Load generator" eyebrow="Same path, more events">
            <label className="block text-xs font-semibold uppercase tracking-widest text-fg-subtle">
              Commands
            </label>
            <input
              className="mt-2 w-full rounded-lg border border-border-strong bg-panel-sunken px-3 py-2 text-sm outline-none focus:border-accent"
              type="number"
              min={1}
              max={10000}
              value={loadCount}
              onChange={(event) =>
                setLoadCount(Math.max(1, Math.min(10000, event.currentTarget.valueAsNumber || 1)))
              }
            />
            {loadProgress && (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-fg-muted">
                  <span>
                    {loadProgress.completed.toLocaleString()} /{' '}
                    {loadProgress.total.toLocaleString()}
                  </span>
                  <span>{Math.round(loadProgress.elapsedMs)} ms</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-panel-sunken">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${(loadProgress.completed / loadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            <Button
              className="mt-3 w-full"
              variant="primary"
              isDisabled={busy || !projectionsAvailable}
              onPress={() => void runLoad()}
            >
              <Activity size={16} /> Generate load
            </Button>
          </Panel>
        </aside>

        <section className="min-w-0 rounded-2xl border border-border bg-panel p-5 lg:p-6">
          <p className="eyebrow">Separate read-only entrypoint</p>
          <h2 className="mt-1 text-xl font-black">REST → Query module → projections</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[180px_auto_auto]">
            <Select
              label="Requesting user"
              value={queryUser}
              options={userOptions}
              onChange={(value) => setQueryUser(value as typeof queryUser)}
            />
            <Button
              className="self-end"
              isDisabled={!projectionsAvailable}
              onPress={() => void runQuery('games')}
            >
              GET /games
            </Button>
            <Button
              className="self-end"
              variant="primary"
              isDisabled={!projectionsAvailable}
              onPress={() => void runQuery('chunks')}
            >
              GET /games/oowha/chunks
            </Button>
          </div>
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-border bg-panel-sunken p-4 text-xs leading-5 text-fg-muted">
            {queryResult}
          </pre>
        </section>

        <section className="min-w-0 rounded-2xl border border-border bg-panel p-5 lg:p-6">
          <div className="flex items-end justify-between">
            <div>
              <p className="eyebrow">Immutable source of truth</p>
              <h2 className="mt-1 text-xl font-black">Recent domain events</h2>
            </div>
            <Button variant="ghost" size="sm" onPress={() => setViewerOpen(true)}>
              View raw rows <ArrowRight size={14} />
            </Button>
          </div>
          <div className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-panel-sunken">
            {snapshot.recentEvents.map((event) => (
              <div
                key={String(event.sequence)}
                className="grid grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 text-xs"
              >
                <span className="font-mono text-fg-subtle">#{String(event.sequence)}</span>
                <span className="truncate font-semibold text-fg">{String(event.event_type)}</span>
                <span className="font-mono text-[10px] text-fg-subtle">
                  {String(event.actor_user_id)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-3 text-center text-xs text-fg-subtle">
        {message}
      </footer>
      {viewerOpen && (
        <DatabaseViewer
          database={runtime.database}
          revision={revision}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </div>
  );
}

function Panel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-panel p-5">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-1 mb-3 text-lg font-black">{title}</h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-panel-sunken p-2 text-center">
      <Icon size={13} className="mx-auto text-fg-subtle" />
      <strong className="mt-1 block text-sm">{value.toLocaleString()}</strong>
      <span className="text-[9px] uppercase tracking-wide text-fg-subtle">{label}</span>
    </div>
  );
}

function StatusPill({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="hidden items-center gap-2 rounded-lg border border-border bg-panel-sunken px-3 py-2 md:flex">
      <Icon size={14} className={warning ? 'text-danger' : 'text-accent'} />
      <div>
        <span className="block text-[9px] uppercase tracking-widest text-fg-subtle">{label}</span>
        <strong className="block text-xs">{value}</strong>
      </div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6 text-fg">
      <div className="text-center">
        <div className="mx-auto mb-4 grid size-14 animate-pulse place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
          <Database size={26} />
        </div>
        <h1 className="text-xl font-black">Starting Turso WASM</h1>
        <p className="mt-2 text-sm text-fg-muted">{message}</p>
      </div>
    </main>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
