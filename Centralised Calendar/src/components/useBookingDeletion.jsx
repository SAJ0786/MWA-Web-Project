import { useState } from 'react';
import { deleteBooking } from '../services/eventsService.js';
import { planSeriesDeletes } from '../utils/seriesDelete.js';
import SeriesDeletePrompt from './SeriesDeletePrompt.jsx';

/**
 * Shared single/bulk booking deletion with the recurring-series scope prompt.
 * `loaded` is the full list currently on screen, used to hide occurrences a series delete removed.
 * `onRemoved(ids)` lets the caller drop them from its selection.
 */
export function useBookingDeletion({ loaded, onSaved, onRemoved }) {
  const [deleted, setDeleted] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState([]);
  const [prompt, setPrompt] = useState(null);

  function remove(items) {
    if (busy || !items.length) return;
    if (items.some(item => item.seriesId)) { setPrompt(items); return; }
    const description = items.length === 1 ? `"${items[0].title}"` : `${items.length} selected bookings`;
    if (!window.confirm(`Permanently delete ${description}? This cannot be undone.`)) return;
    run(items, 'single');
  }

  async function run(items, scope) {
    setPrompt(null);
    setBusy(true); setMessage(''); setErrors([]);
    const now = new Date().toISOString();
    const removed = [];
    const failures = [];
    let total = 0;
    let kept = 0;
    try {
      for (const { anchor, scope: itemScope, covers } of planSeriesDeletes(items, scope)) {
        try {
          const res = await deleteBooking(anchor.id, itemScope);
          total += res?.deleted ?? 1;
          kept += res?.kept || 0;
          const ids = itemScope === 'single' ? [anchor.id] : loaded.filter(e => covers(e, now)).map(e => e.id);
          removed.push(...ids);
          setDeleted(prev => [...prev, ...ids]);
        } catch (err) {
          failures.push(`${anchor.title}: ${err?.message || 'Could not delete this booking.'}`);
        }
      }
      onRemoved && onRemoved(removed);
      setMessage(`${total} booking${total === 1 ? '' : 's'} deleted.` +
        (kept ? ` ${kept} past occurrence${kept === 1 ? '' : 's'} kept as records.` : '') +
        (failures.length ? ` ${failures.length} could not be deleted.` : ''));
      setErrors(failures);
      if (removed.length) onSaved && onSaved();
    } finally { setBusy(false); }
  }

  const promptElement = prompt && (
    <SeriesDeletePrompt title={prompt[0].title} count={prompt.length}
      onChoose={scope => run(prompt, scope)} onCancel={() => setPrompt(null)} />
  );

  const feedback = (
    <>
      {message && <div className="ok" role="status">{message}</div>}
      {errors.length > 0 && <div className="err" role="alert"><ul>{errors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}
    </>
  );

  return { deleted, busy, remove, promptElement, feedback };
}
