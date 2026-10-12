import { Link2, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { generateTimelineShareToken, revokeTimelineShareToken, timelineShareUrl } from '../../data/timelineShare';
import { useT } from '../../i18n';
import { showToast } from '../../lib/toast';
import { Button, Dialog, Field, TextInput } from '../ui';

/**
 * Distribuirea programului prin link public, în citire. Serverul ține doar hash-ul tokenului, deci linkul se
 * vede o singură dată, în acest dialog; un link nou îl înlocuiește pe cel trimis înainte, iar „Oprește
 * distribuirea" îl oprește fără să facă altul (în doi pași, ca la ștergere).
 */
export function ShareDialog({
  open,
  weddingId,
  weddingName,
  onClose,
}: {
  open: boolean;
  weddingId: string;
  weddingName: string;
  onClose: () => void;
}) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingStop, setConfirmingStop] = useState(false);

  // Linkul nu se păstrează între deschideri: după închidere nu mai există nicăieri în clar.
  useEffect(() => {
    if (open) return;
    setUrl(null);
    setConfirmingStop(false);
  }, [open]);

  const create = async () => {
    setBusy(true);
    try {
      setUrl(timelineShareUrl(await generateTimelineShareToken(weddingId)));
      setConfirmingStop(false);
    } catch {
      showToast(t.timeline.shareFailed);
    } finally {
      setBusy(false);
    }
  };

  const stop = async () => {
    if (!confirmingStop) return setConfirmingStop(true);
    setBusy(true);
    try {
      await revokeTimelineShareToken(weddingId);
      showToast(t.timeline.shareStopped, 'info');
      onClose();
    } catch {
      showToast(t.timeline.shareFailed);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.timeline.shareCopied, 'info');
    } catch {
      showToast(t.timeline.shareFailed);
    }
  };

  const whatsapp = () => {
    if (!url) return;
    const href = `https://wa.me/?text=${encodeURIComponent(t.timeline.shareMessage(weddingName, url))}`;
    window.open(href, '_blank', 'noopener');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.timeline.shareTitle}
      // Crearea (și oprirea) rulează pe server chiar dacă fereastra s-ar închide: un link nou ar înlocui
      // pe cel vechi fără să-l mai vedeți. Cât timp cererea e în curs, dialogul nu se închide.
      locked={busy}
      actions={
        <>
          <div className="mr-auto flex flex-col items-start gap-1">
            {confirmingStop && <p className="text-xs text-minus">{t.timeline.shareStopWarning}</p>}
            <Button variant={confirmingStop ? 'dangerSolid' : 'danger'} disabled={busy} onClick={stop}>
              {confirmingStop ? t.timeline.shareStopConfirm : t.timeline.shareStop}
            </Button>
          </div>
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            {t.timeline.shareClose}
          </Button>
          {!url && (
            <Button disabled={busy} aria-busy={busy} onClick={create}>
              {t.timeline.shareCreate}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-4">
        <p>{t.timeline.shareIntro}</p>
        {url && (
          <div className="grid gap-3">
            <Field label={t.timeline.shareLinkLabel}>
              <TextInput readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={copy}>
                <Link2 size={14} aria-hidden="true" />
                {t.timeline.shareCopy}
              </Button>
              <Button variant="ghost" onClick={whatsapp}>
                <MessageCircle size={14} aria-hidden="true" />
                {t.timeline.shareWhatsapp}
              </Button>
            </div>
          </div>
        )}
        <p className="text-xs">{t.timeline.shareReplaces}</p>
      </div>
    </Dialog>
  );
}
