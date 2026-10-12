import { useEffect, useId, useRef, useState } from 'react';
import type { TimelineDraft } from '../../data/timelineActions';
import { type EventErrors, parseDuration, type TimelineEvent, validateEvent } from '../../domain/timeline';
import { useT } from '../../i18n';
import { Button, Dialog, Field, TextArea, TextInput } from '../ui';

/**
 * Formularul unui eveniment din program, pentru adăugare (`event` lipsește) sau editare. La editare apare și
 * ștergerea, în doi pași. Închiderea o face apelantul prin `onClose`; trimiterea validă o închide singură.
 */
export function EventDialog({
  open,
  event,
  defaultStart,
  onSubmit,
  onDelete,
  onClose,
}: {
  open: boolean;
  event?: TimelineEvent;
  /** Ora propusă la un eveniment nou. */
  defaultStart: string;
  onSubmit: (draft: TimelineDraft) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const titleErrorId = useId();
  const timeErrorId = useId();
  const durationErrorId = useId();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(defaultStart);
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<EventErrors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Formularul pornește de la zero (sau de la evenimentul editat) doar la deschidere: un eveniment adăugat
  // de partener în timp ce scrieți nu trebuie să vă șteargă ce ați scris.
  const latest = useRef({ event, defaultStart });
  latest.current = { event, defaultStart };
  useEffect(() => {
    if (!open) return;
    const { event: current, defaultStart: start } = latest.current;
    setTitle(current?.title ?? '');
    setStartTime(current?.startTime ?? start);
    setDuration(current?.durationMinutes != null ? String(current.durationMinutes) : '');
    setLocation(current?.location ?? '');
    setNotes(current?.notes ?? '');
    setErrors({});
    setConfirmingDelete(false);
  }, [open]);

  const submit = () => {
    const found = validateEvent({ title, startTime, duration });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({
      title: title.trim(),
      startTime,
      durationMinutes: parseDuration(duration),
      location: location.trim(),
      notes: notes.trim(),
    });
    onClose();
  };

  const invalid = (on: boolean | undefined) => (on ? true : undefined);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={event ? t.timeline.editTitle : t.timeline.newTitle}
      actions={
        <>
          {event && onDelete && (
            <div className="mr-auto flex flex-col items-start gap-1">
              {confirmingDelete && <p className="text-xs text-minus">{t.timeline.deleteWarning}</p>}
              <Button
                variant={confirmingDelete ? 'dangerSolid' : 'danger'}
                onClick={() => {
                  if (!confirmingDelete) return setConfirmingDelete(true);
                  onDelete();
                  onClose();
                }}
              >
                {confirmingDelete ? t.timeline.confirmDelete : t.timeline.delete}
              </Button>
            </div>
          )}
          <Button variant="ghost" onClick={onClose}>
            {t.timeline.cancel}
          </Button>
          <Button onClick={submit}>{event ? t.timeline.save : t.timeline.add}</Button>
        </>
      }
    >
      <form
        className="grid gap-4"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div>
          <Field label={t.timeline.fieldTitle}>
            <TextInput
              value={title}
              maxLength={120}
              aria-invalid={invalid(errors.title)}
              aria-describedby={errors.title ? titleErrorId : undefined}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          {errors.title && (
            <p id={titleErrorId} role="alert" className="mt-1 text-xs text-minus">
              {t.timeline.errorTitle}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Field label={t.timeline.fieldTime}>
              <TextInput
                type="time"
                value={startTime}
                aria-invalid={invalid(errors.startTime)}
                aria-describedby={errors.startTime ? timeErrorId : undefined}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </Field>
            {errors.startTime && (
              <p id={timeErrorId} role="alert" className="mt-1 text-xs text-minus">
                {t.timeline.errorTime}
              </p>
            )}
          </div>
          <div>
            <Field label={t.timeline.fieldDuration}>
              <TextInput
                inputMode="numeric"
                value={duration}
                aria-invalid={invalid(errors.duration)}
                aria-describedby={errors.duration ? durationErrorId : undefined}
                onChange={(e) => setDuration(e.target.value)}
              />
            </Field>
            {errors.duration && (
              <p id={durationErrorId} role="alert" className="mt-1 text-xs text-minus">
                {t.timeline.errorDuration}
              </p>
            )}
          </div>
        </div>
        <p className="-mt-2 text-xs text-muted">{t.timeline.fieldDurationHint}</p>
        <Field label={t.timeline.fieldLocation}>
          <TextInput value={location} maxLength={120} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label={t.timeline.fieldNotes}>
          <TextArea rows={3} value={notes} maxLength={1000} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {/* Enter în câmpuri trimite formularul; butonul vizibil e în acțiunile dialogului. */}
        <button type="submit" hidden />
      </form>
    </Dialog>
  );
}
