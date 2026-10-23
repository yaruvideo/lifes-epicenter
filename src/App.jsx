import { useEffect, useState } from 'react';
import { applyLook, DEFAULT_LOOK } from './themes.js';
import { useItems, useMe } from './store.js';
import { onStatus, start } from './sync.js';
import { PEOPLE } from './config.js';
import Today from './screens/Today.jsx';
import Tasks from './screens/Tasks.jsx';
import Journal from './screens/Journal.jsx';
import Appearance from './screens/Appearance.jsx';
import Settings from './screens/Settings.jsx';
import Soon from './screens/Soon.jsx';

const MAIN = [
  ['today', 'Today'], ['journal', 'Journal'], ['tasks', 'Tasks'],
  ['calendar', 'Calendar', true], ['health', 'Health & macros', true], ['shared', 'Shared with Hannah', true]
];
const LIBRARY = [['games', 'Games'], ['books', 'Books & manga'], ['shows', 'Shows & movies']];
const SECTIONS = [['gamedev', 'Game Dev', '#FF9F45'], ['video', 'Video Projects', '#F2545B'], ['client', 'Client Work', '#7FA8F5']];
const NAMES = Object.fromEntries([...MAIN, ...LIBRARY, ...SECTIONS, ['appearance', 'Appearance'], ['settings', 'Settings']].map(([id, n]) => [id, n]));

const route = () => (location.hash.replace(/^#\/?/, '') || 'today');

export default function App() {
  const [page, setPage] = useState(route);
  const [me] = useMe();
  const [sync, setSync] = useState(null);
  const looks = useItems('look');

  useEffect(() => {
    const h = () => setPage(route());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  useEffect(() => onStatus(setSync), []);
  useEffect(() => { start(); }, []);

  const look = looks.find((l) => l.id === 'look-' + me) || { ...DEFAULT_LOOK, theme: me === 'hannah' ? 'classic' : 'eva01' };
  useEffect(() => { applyLook(look); }, [JSON.stringify(look)]);

  const link = (id, label, extra) => (
    <a key={id} href={'#/' + id} className={'nav' + (page === id ? ' on' : '')} aria-current={page === id ? 'page' : undefined}>{extra}{label}</a>
  );

  let screen;
  if (page === 'today') screen = <Today me={me} />;
  else if (page === 'tasks') screen = <Tasks me={me} />;
  else if (page === 'journal') screen = <Journal me={me} />;
  else if (page === 'appearance') screen = <Appearance me={me} look={look} />;
  else if (page === 'settings') screen = <Settings />;
  else screen = <Soon name={NAMES[page] || 'This page'} />;

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand"><div className="logo">E</div>Life's Epicenter</div>
        <div className="navgroup">{MAIN.map(([id, label]) => link(id, id === 'shared' ? 'Shared with ' + PEOPLE[me === 'yaru' ? 'hannah' : 'yaru'].name : label))}</div>
        <div className="navgroup"><div className="navlabel">Library</div>{LIBRARY.map(([id, label]) => link(id, label))}</div>
        <div className="navgroup"><div className="navlabel">Sections</div>{SECTIONS.map(([id, label, c]) => link(id, label, <span className="dot" style={{ background: c }} />))}</div>
        <div className="navgroup bottom">
          {link('appearance', 'Appearance')}
          {link('settings', 'Settings & sync')}
          {sync && <div className="syncpill" role="status">{sync.message}</div>}
        </div>
      </nav>
      <main>{screen}</main>
      <nav className="mobilebar" aria-label="Main">
        {[['today', 'Today'], ['tasks', 'Tasks'], ['journal', 'Journal'], ['appearance', 'Look'], ['settings', 'Settings']].map(([id, label]) => (
          <a key={id} href={'#/' + id} className={page === id ? 'on' : ''}>{label}</a>
        ))}
      </nav>
    </div>
  );
}
