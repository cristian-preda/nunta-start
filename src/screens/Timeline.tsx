import { ArrowDown, ArrowUp, CalendarClock, MapPin, Pencil, Plus } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { EventDialog } from '../components/timeline/EventDialog';
import { Banner, Button, Card, EmptyState, IconButton } from '../components/ui';
import { useTimeline } from '../data/hooks';
import { useTimelineActions } from '../data/timelineActions';
import { endTime, formatDuration, suggestStartTime } from '../domain/timeline';
import { useT } from '../i18n';
import { useWedding } from '../lib/wedding';

/** Programul zilei nunții: evenimentele în ordine, cu adăugare, editare, ștergere și mutare. */
export function Timeline() {
  const t = useT();
  const { id: weddingId, canEdit } = useWedding();
  const events = useTimeline(weddingId);
  const actions = useTimelineActions(weddingId);
  const readOnly = !canEdit('timeline');
  // `null`: dialog închis; `'new'`: eveniment nou; un id: editarea acelui eveniment.
  const [dialog, setDialog] = useState<'new' | string | null>(null);
  const editing = dialog && dialog !== 'new' ? events.find((e) => e.id === dialog) : undefined;
  const sorted = [...events].sort((a, b) => a.position - b.position);

  return (
    <>
      <PageHeader
        title={t.timeline.title}
        subtitle={t.timeline.subtitle}
        action={
          readOnly ? undefined : (
            <Button onClick={() => setDialog('new')}>
              <Plus size={16} aria-hidden="true" />
              {t.timeline.newEvent}
            </Button>
          )
        }
      />
      {readOnly && <Banner className="mb-6">{t.timeline.readOnly}</Banner>}

      {sorted.length === 0 ? (
        <EmptyState icon={CalendarClock} title={t.timeline.emptyTitle}>
          {t.timeline.emptyHint}
        </EmptyState>
      ) : (
        <>
          <ol aria-label={t.timeline.listLabel} className="grid gap-3">
            {sorted.map((event, index) => {
              const end = endTime(event.startTime, event.durationMinutes);
              return (
                <li key={event.id}>
                  <Card className="flex flex-col gap-2 p-4 md:flex-row md:items-start md:gap-4">
                    <div className="flex min-w-0 flex-1 gap-4">
                      <div className="w-16 shrink-0">
                        <p className="font-serif text-xl leading-tight tabular-nums">{event.startTime}</p>
                        {end && <p className="text-xs text-muted tabular-nums">{t.timeline.until(end)}</p>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-semibold">{event.title}</h2>
                        {(event.location || event.durationMinutes !== null) && (
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted">
                            {event.location && (
                              <span className="inline-flex items-center gap-1 break-words">
                                <MapPin size={14} aria-hidden="true" />
                                {event.location}
                              </span>
                            )}
                            {event.durationMinutes !== null && <span>{formatDuration(event.durationMinutes)}</span>}
                          </p>
                        )}
                        {event.notes && <p className="mt-1 whitespace-pre-wrap break-words text-sm">{event.notes}</p>}
                      </div>
                    </div>
                    {!readOnly && (
                      <div className="flex justify-end gap-1">
                        <IconButton
                          label={t.timeline.moveUp(event.title)}
                          disabled={index === 0}
                          onClick={() => actions.moveEvent(event.id, -1)}
                        >
                          <ArrowUp size={18} aria-hidden="true" />
                        </IconButton>
                        <IconButton
                          label={t.timeline.moveDown(event.title)}
                          disabled={index === sorted.length - 1}
                          onClick={() => actions.moveEvent(event.id, 1)}
                        >
                          <ArrowDown size={18} aria-hidden="true" />
                        </IconButton>
                        <IconButton label={t.timeline.edit(event.title)} onClick={() => setDialog(event.id)}>
                          <Pencil size={18} aria-hidden="true" />
                        </IconButton>
                      </div>
                    )}
                  </Card>
                </li>
              );
            })}
          </ol>
          {!readOnly && <p className="mt-4 text-xs text-muted">{t.timeline.orderHint}</p>}
        </>
      )}

      {!readOnly && (
        <EventDialog
          open={dialog !== null && (dialog === 'new' || editing !== undefined)}
          event={editing}
          defaultStart={suggestStartTime(sorted)}
          onSubmit={(draft) => (editing ? actions.updateEvent(editing.id, draft) : actions.addEvent(draft))}
          onDelete={editing ? () => actions.removeEvent(editing.id) : undefined}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
