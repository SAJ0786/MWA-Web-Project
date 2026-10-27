import { useState } from 'react';

const OPTIONS = [
  { value: 'single', label: 'This event only', hint: 'Delete just the selected occurrence.' },
  { value: 'future', label: 'This and following events', hint: 'Delete the selected occurrence and every later one in the series.' },
  { value: 'all', label: 'All events in the series', hint: 'Delete every upcoming occurrence in the series.' }
];

/**
 * Asks which part of a recurring series to delete.
 * `count` > 1 means several selected bookings are being deleted together; the choice applies to each series among them.
 */
export default function SeriesDeletePrompt({ title, count = 1, onChoose, onCancel }) {
  const [scope, setScope] = useState('single');
  const many = count > 1;
  return (
    <div className="overlay show series-prompt" onClick={e => { e.stopPropagation(); onCancel(); }}>
      <div className="dlg" role="alertdialog" aria-modal="true" aria-labelledby="series-delete-title"
        aria-describedby="series-delete-desc" onClick={e => e.stopPropagation()}>
        <h3 id="series-delete-title" style={{ marginTop: 0 }}>Delete recurring event</h3>
        <p id="series-delete-desc" className="muted" style={{ marginTop: 0 }}>
          {many
            ? `${count} selected bookings include recurring events. Choose what to delete for each recurring event.`
            : <>“{title}” is part of a recurring series. What would you like to delete?</>}
        </p>
        <div role="radiogroup" aria-label="Delete scope" className="series-options">
          {OPTIONS.map(o => (
            <label key={o.value} className={`series-option ${scope === o.value ? 'on' : ''}`}>
              <input type="radio" name="series-delete-scope" value={o.value} style={{ width: 'auto' }}
                checked={scope === o.value} onChange={() => setScope(o.value)} />
              <span><b>{o.label}</b><br /><span className="muted">{o.hint}</span></span>
            </label>
          ))}
        </div>
        {scope !== 'single' && <p className="muted">Occurrences that have already started are kept as records.</p>}
        <p className="muted">This cannot be undone.</p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn del" onClick={() => onChoose(scope)}>Delete</button>
        </div>
      </div>
    </div>
  );
}
