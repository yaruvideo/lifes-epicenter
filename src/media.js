// One "media" item covers games, books, manga, webtoons, comics, shows and movies.
export const TYPES = {
  game: { label: 'Game', unit: 'Session', active: 'Playing' },
  manga: { label: 'Manga', unit: 'Ch', active: 'Reading' },
  webtoon: { label: 'Webtoon', unit: 'Ep', active: 'Reading' },
  comic: { label: 'Comic', unit: '#', active: 'Reading' },
  book: { label: 'Book', unit: 'Ch', active: 'Reading' },
  show: { label: 'Show', unit: 'Ep', active: 'Watching' },
  movie: { label: 'Movie', unit: null, active: 'Watching' }
};

export const STATUSES = [['active', 'In progress'], ['planned', 'Want to'], ['paused', 'On hold'], ['finished', 'Finished'], ['dropped', 'Dropped']];
export const statusLabel = (type, s) => (s === 'active' ? TYPES[type]?.active || 'In progress' : (STATUSES.find((x) => x[0] === s) || [s, s])[1]);

// For shows: which part is being watched and which episode is next.
export function nextUp(item) {
  const parts = item.parts || [];
  const i = parts.findIndex((p) => (p.watched || 0) < (p.episodes || Infinity));
  if (i < 0) return null;
  return { index: i, part: parts[i], ep: (parts[i].watched || 0) + 1 };
}

export function progressText(item) {
  if (item.type === 'show') {
    const n = nextUp(item);
    return n ? n.part.name + ' · next Ep ' + n.ep + (n.part.episodes ? ' of ' + n.part.episodes : '') : 'All caught up';
  }
  if (item.type === 'movie') return item.status === 'finished' ? 'Watched' : '';
  const u = TYPES[item.type]?.unit;
  if (item.type === 'game') return (item.sessions || 0) + (item.sessions === 1 ? ' session' : ' sessions') + (item.hours ? ' · ' + item.hours + ' h' : '');
  return u + ' ' + (item.progress || 0) + (item.total ? ' of ' + item.total : '');
}
