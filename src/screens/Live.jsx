import { useEffect, useRef, useState } from 'react';

// A text box that keeps its own text while you type and saves shortly after,
// so typing never lags or loses letters while the database catches up.
export default function Live({ as: Tag = 'input', value, onSave, delay = 400, ...props }) {
  const [text, setText] = useState(value ?? '');
  const focused = useRef(false);
  const timer = useRef(null);
  useEffect(() => { if (!focused.current) setText(value ?? ''); }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const flush = (v) => { clearTimeout(timer.current); if (v !== (value ?? '')) onSave(v); };
  return (
    <Tag
      {...props}
      value={text}
      onFocus={() => { focused.current = true; }}
      onBlur={() => { focused.current = false; flush(text); }}
      onChange={(e) => { const v = e.target.value; setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => onSave(v), delay); }}
    />
  );
}
