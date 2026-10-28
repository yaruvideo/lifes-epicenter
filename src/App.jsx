import { useEffect, useState } from 'react';
import { applyLook, DEFAULT_LOOK } from './themes.js';
import { useItems, useMe } from './store.js';
import { onStatus, start } from './sync.js';
import { PEOPLE, PREVIEW } from './config.js';
import { ProjectsProvider } from './projectlinks.js';
import Today from './screens/Today.jsx';
import Tasks from './screens/Tasks.jsx';
import Journal from './screens/Journal.jsx';
import Appearance from './screens/Appearance.jsx';
import Settings from './screens/Settings.jsx';
import Soon from './screens/Soon.jsx';
import Health from './screens/Health.jsx';
import Recipes from './screens/Recipes.jsx';
import Calendar from './screens/Calendar.jsx';
import Shared from './screens/Shared.jsx';
import Library from './screens/Library.jsx';
import GameDev from './screens/GameDev.jsx';
import Video from './screens/Video.jsx';
import Client from './screens/Client.jsx';
import { startReminders } from './reminders.js';
import { device } from './db.js';
import { refreshApp } from './refresh.js';

const MAIN = [
  ['today', 'Today'], ['journal', 'Journal'], ['tasks', 'Tasks'],
  ['calendar', 'Calendar'], ['health', 'Health & macros'], ['recipes', 'Recipes'], ['shared', 'Shared with Hannah']
];
const LIBRARY = [['games', 'Games'], ['books', 'Books & manga'], ['shows', 'Shows & movies']];
const SECTIONS = [['gamedev', 'Game Dev', '#FF9F45'], ['video', 'Video Projects', '#F2545B'], ['client', 'Client Work', '#7FA8F5']];
const NAMES = Object.fromEntries([...MAIN, ...LIBRARY, ...SECTIONS, ['appearance', 'Appearance'], ['settings', 'Settings']].map(([id, n]) => [id, n]));

const route = () => (location.hash.replace(/^#\/?/, '') || 'today');

export default function App() {
  const [page, setPage] = useState(route);
  const [me] = useMe();
  const [refreshing, setRefreshing] = useState(false);
  const [sync, setSync] = useState(null);
  const looks = useItems('look');

  useEffect(() => {
    const h = () => setPage(route());
    window.addEventListener('hashchange', h);
    return () => window.removeEventListener('hashchange', h);
  }, []);
  useEffect(() => onStatus(setSync), []);
  useEffect(() => { start(); return startReminders(() => device.get('me', 'yaru')); }, []);

  const look = looks.find((l) => l.id === 'look-' + me) || { ...DEFAULT_LOOK, theme: me === 'hannah' ? 'classic' : 'eva01' };
  useEffect(() => { applyLook(look); }, [JSON.stringify(look)]);

  const link = (id, label, extra) => (
    <a key={id} href={'#/' + id} className={'nav' + (page === id ? ' on' : '')} aria-current={page === id ? 'page' : undefined}>{extra}{label}</a>
  );

  let screen;
  if (page === 'today') screen = <Today me={me} />;
  else if (page === 'tasks') screen = <Tasks me={me} />;
  else if (page === 'journal') screen = <Journal me={me} />;
  else if (page === 'health') screen = <Health me={me} />;
  else if (page === 'recipes') screen = <Recipes me={me} />;
  else if (page === 'calendar') screen = <Calendar me={me} />;
  else if (page === 'shared') screen = <Shared me={me} />;
  else if (page === 'gamedev') screen = <GameDev me={me} />;
  else if (page === 'video') screen = <Video me={me} />;
  else if (page === 'client') screen = <Client me={me} />;
  else if (page === 'games') screen = <Library key="games" me={me} title="Games" sub="Playing, backlog and session notes" types={['game']} addPlaceholder="Add a game…" />;
  else if (page === 'books') screen = <Library key="books" me={me} title="Books & manga" sub="Manga, webtoons, comics and books" types={['manga', 'webtoon', 'comic', 'book']} addPlaceholder="Add something to read…" />;
  else if (page === 'shows') screen = <Library key="shows" me={me} title="Shows & movies" sub="What you're watching, episode by episode" types={['show', 'movie']} addPlaceholder="Add a show or movie…" />;
  else if (page === 'appearance') screen = <Appearance me={me} look={look} />;
  else if (page === 'settings') screen = <Settings />;
  else screen = <Soon name={NAMES[page] || 'This page'} />;

  return (
    <ProjectsProvider>
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div className="brand"><div className="logo">E</div>Life's Epicenter</div>
        <div className="navgroup">{MAIN.map(([id, label]) => link(id, id === 'shared' ? 'Shared with ' + PEOPLE[me === 'yaru' ? 'hannah' : 'yaru'].name : label))}</div>
        <div className="navgroup"><div className="navlabel">Library</div>{LIBRARY.map(([id, label]) => link(id, label))}</div>
        <div className="navgroup"><div className="navlabel">Sections</div>{SECTIONS.map(([id, label, c]) => link(id, label, <span className="dot" style={{ background: c }} />))}</div>
        <div className="navgroup bottom">
          {link('appearance', 'Appearance')}
          {link('settings', 'Settings & sync')}
          <button type="button" className="nav navbtn" disabled={refreshing} onClick={() => { setRefreshing(true); refreshApp(); }}>{refreshing ? 'Refreshing…' : '⟳ Refresh'}</button>
          {sync && <div className="syncpill" role="status">{sync.message}</div>}
        </div>
      </nav>
      <main>{PREVIEW && <div className="previewbar" role="note"><b>Preview copy.</b> It shows your real data, but changes you make here stay here and won't reach your real app.</div>}{screen}</main>
      <nav className="mobilebar" aria-label="Main">
        {[['today', 'Today'], ['tasks', 'Tasks'], ['health', 'Health'], ['journal', 'Journal'], ['settings', 'More']].map(([id, label]) => (
          <a key={id} href={'#/' + id} className={page === id ? 'on' : ''}>{label}</a>
        ))}
      </nav>
    </div>
    </ProjectsProvider>
  );
}
