import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { neighboursAfterMove, neighboursForTime } from '../domain/timeline';
import { keys } from '../lib/queryKeys';
import { useListMutation } from './guestActions';
import {
  positionBetween,
  type ServerTimelineEvent,
  type TimelineEventPatch,
  timelineEventPatchToUpdate,
} from './mappers';
import { deleteTimelineEvent, insertTimelineEvent, updateTimelineEvent } from './timeline';

export type TimelineDraft = Omit<ServerTimelineEvent, 'id' | 'position'>;

export interface TimelineActions {
  /** Eveniment nou, pus la locul lui după oră; întoarce id-ul (UUID de client). */
  addEvent(draft: TimelineDraft): string;
  /** Doar câmpurile schimbate pleacă spre server; dacă ora se schimbă, evenimentul își ia locul după oră. */
  updateEvent(id: string, draft: TimelineDraft): void;
  removeEvent(id: string): void;
  /** Un loc în sus (-1) sau în jos (+1); nu face nimic la capătul listei. */
  moveEvent(id: string, direction: -1 | 1): void;
}

const byPosition = (a: ServerTimelineEvent, b: ServerTimelineEvent) => a.position - b.position;

/** Programul zilei nunții: adăugare, editare, ștergere și mutare, toate optimiste (vezi guestActions.ts). */
export function useTimelineActions(weddingId: string): TimelineActions {
  const queryClient = useQueryClient();
  const key = keys.wedding(weddingId).timeline();

  const add = useListMutation<ServerTimelineEvent, ServerTimelineEvent>(
    weddingId,
    key,
    (e) => insertTimelineEvent(weddingId, e),
    (list, e) => [...list, e].sort(byPosition),
    'timeline',
  );
  const update = useListMutation<ServerTimelineEvent, { id: string; patch: TimelineEventPatch; position?: number }>(
    weddingId,
    key,
    ({ id, patch, position }) => updateTimelineEvent(id, timelineEventPatchToUpdate(patch, position)),
    (list, { id, patch, position }) =>
      list
        .map((e) => (e.id === id ? { ...e, ...patch, ...(position !== undefined && { position }) } : e))
        .sort(byPosition),
    'timeline',
  );
  const remove = useListMutation<ServerTimelineEvent, string>(
    weddingId,
    key,
    deleteTimelineEvent,
    (list, id) => list.filter((e) => e.id !== id),
    'timeline',
  );
  const { mutate: addM } = add;
  const { mutate: updateM } = update;
  const { mutate: removeM } = remove;

  return useMemo<TimelineActions>(() => {
    const cached = () => queryClient.getQueryData<ServerTimelineEvent[]>(key) ?? [];
    return {
      addEvent: (draft) => {
        const event: ServerTimelineEvent = {
          id: crypto.randomUUID(),
          ...draft,
          position: positionBetween(...neighboursForTime(cached(), draft.startTime)),
        };
        addM(event);
        return event.id;
      },
      updateEvent: (id, draft) => {
        const current = cached().find((e) => e.id === id);
        if (!current) return;
        const patch = Object.fromEntries(
          Object.entries(draft).filter(([k, v]) => v !== current[k as keyof TimelineDraft]),
        ) as TimelineEventPatch;
        if (Object.keys(patch).length === 0) return;
        const position =
          patch.startTime !== undefined
            ? positionBetween(...neighboursForTime(cached(), patch.startTime, id))
            : undefined;
        updateM({ id, patch, position });
      },
      removeEvent: (id) => removeM(id),
      moveEvent: (id, direction) => {
        const neighbours = neighboursAfterMove(cached(), id, direction);
        if (neighbours) updateM({ id, patch: {}, position: positionBetween(...neighbours) });
      },
    };
  }, [queryClient, key, addM, updateM, removeM]);
}
