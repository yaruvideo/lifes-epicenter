import { useState } from 'react';
import { addTask } from '../tasks.js';
import { other } from '../store.js';
import { PEOPLE } from '../config.js';

export default function QuickAdd({ me, extra, placeholder = 'Add a task…' }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState(me);
  const submit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask(title, me, { owner, ...extra });
    setTitle('');
  };
  return (
    <form className="row" onSubmit={submit}>
      <input className="field" style={{ flex: '1 1 240px' }} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={placeholder} aria-label="New task" />
      <select className="field" style={{ width: 'auto' }} value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="For whom">
        <option value={me}>For me</option>
        <option value={other(me)}>For {PEOPLE[other(me)].name}</option>
        <option value="both">Together</option>
      </select>
      <button className="btn" type="submit">Add</button>
    </form>
  );
}
