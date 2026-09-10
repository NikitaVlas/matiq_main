'use client';
import { useEffect, useState } from 'react';
import {
  type CatalogVideo,
  type Filters,
  type FilterKey,
  filterLabels,
  filterOptions,
  filterVideos,
} from './catalog';
import { usePublicData } from './use-public-data';
import { VideoCard } from './VideoCard';
export default function VideoCatalog() {
  const { data: videos, error, retry } = usePublicData<CatalogVideo[]>('/content/videos');
  const [filters, setFilters] = useState<Filters>({});
  const [query, setQuery] = useState('');
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get('q') ?? '');
      setFilters(
        Object.fromEntries(
          (Object.keys(filterLabels) as FilterKey[]).map((key) => [key, params.get(key) ?? '']),
        ),
      );
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function update(next: Filters, search: string) {
    setFilters(next);
    setQuery(search);
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${params.size ? `?${params}` : ''}`,
    );
  }
  const selected = Object.values(filters).filter(Boolean).length;
  const filtered = filterVideos(videos ?? [], filters, query);
  return (
    <main className="catalog-page">
      <header className="catalog-heading">
        <p className="eyebrow">MATIQ Videothek</p>
        <h1>Finde die Technik für deinen nächsten Schritt.</h1>
        <p>
          Entdecke alle veröffentlichten Videos. Filtern und Stöbern ist ohne Mitgliedschaft
          möglich.
        </p>
      </header>
      <section className="catalog-filters" aria-label="Videofilter">
        <label className="catalog-search">
          Videos suchen
          <input
            type="search"
            value={query}
            onChange={(event) => update(filters, event.target.value)}
            placeholder="Titel, Beschreibung oder Trainer"
          />
        </label>
        <div className="catalog-filter-grid">
          {(Object.entries(filterLabels) as [FilterKey, string][]).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`catalog-${key}`}>{label}</label>
              <select
                id={`catalog-${key}`}
                value={filters[key] ?? ''}
                onChange={(event) => update({ ...filters, [key]: event.target.value }, query)}
              >
                <option value="">Alle</option>
                {filterOptions(videos ?? [], key).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
                {filters[key] &&
                  !filterOptions(videos ?? [], key).some(
                    (option) => option.id === filters[key],
                  ) && <option value={filters[key]}>Nicht verfügbar</option>}
              </select>
            </div>
          ))}
        </div>
        <div className="catalog-results-bar">
          <p role="status">
            {videos
              ? `${filtered.length} ${filtered.length === 1 ? 'Video' : 'Videos'}${selected ? ` · ${selected} Filter aktiv` : ''}`
              : error
                ? 'Katalog nicht verfügbar'
                : 'Katalog wird geladen …'}
          </p>
          {(selected > 0 || query) && (
            <button onClick={() => update({}, '')}>Filter zurücksetzen</button>
          )}
        </div>
      </section>
      {error ? (
        <div role="alert">
          <p>Der Videokatalog konnte nicht geladen werden.</p>
          <button onClick={retry}>Erneut versuchen</button>
        </div>
      ) : videos && filtered.length === 0 ? (
        <div className="catalog-empty">
          <h2>{videos.length ? 'Keine passenden Videos' : 'Die Videothek wächst'}</h2>
          <p>
            {videos.length
              ? 'Ändere deine Suche oder setze die Filter zurück.'
              : 'Neue Videos erscheinen nach ihrer Veröffentlichung.'}
          </p>
        </div>
      ) : (
        <section className="catalog-grid" aria-label="Videoergebnisse">
          {filtered.map((video, index) => (
            <VideoCard video={video} index={index} key={video.id} />
          ))}
        </section>
      )}
    </main>
  );
}
