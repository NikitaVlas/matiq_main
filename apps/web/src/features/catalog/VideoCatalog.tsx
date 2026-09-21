'use client';
import { useEffect, useState } from 'react';
import {
  type CatalogPage,
  type CatalogFacets,
  type Filters,
  type FilterKey,
  filterLabels,
} from './catalog';
import { usePublicData } from './use-public-data';
import { VideoCard } from './VideoCard';
export default function VideoCatalog() {
  const [filters, setFilters] = useState<Filters>({});
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const params = new URLSearchParams({ page: String(page), limit: '24' });
  if (search) params.set('q', search);
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const results = usePublicData<CatalogPage>('/content/video-page', params.toString(), 'page');
  const facets = usePublicData<CatalogFacets>('/content/video-facets', '', 'facets');
  const data = search === query ? results.data : undefined;
  const error = results.error || facets.error;
  const retry = () => {
    results.retry();
    facets.retry();
  };
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search);
      setQuery((params.get('q') ?? '').slice(0, 160));
      const pageValue = Number(params.get('page') ?? 1);
      setPage(Number.isInteger(pageValue) && pageValue >= 1 && pageValue <= 10000 ? pageValue : 1);
      setFilters(
        Object.fromEntries(
          (Object.keys(filterLabels) as FilterKey[]).map((key) => [
            key,
            (params.get(key) ?? '').slice(0, 120),
          ]),
        ),
      );
    };
    read();
    window.addEventListener('popstate', read);
    return () => window.removeEventListener('popstate', read);
  }, []);
  function update(next: Filters, search: string, nextPage = 1, push = false) {
    setFilters(next);
    setQuery(search);
    setPage(nextPage);
    const params = new URLSearchParams();
    if (nextPage > 1) params.set('page', String(nextPage));
    if (search) params.set('q', search);
    Object.entries(next).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    window.history[push ? 'pushState' : 'replaceState'](
      null,
      '',
      `${window.location.pathname}${params.size ? `?${params}` : ''}`,
    );
  }
  const selected = Object.values(filters).filter(Boolean).length;
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
            maxLength={160}
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
                {(facets.data?.[key] ?? []).map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
                {filters[key] &&
                  !(facets.data?.[key] ?? []).some((option) => option.id === filters[key]) && (
                    <option value={filters[key]}>Nicht verfügbar</option>
                  )}
              </select>
            </div>
          ))}
        </div>
        <div className="catalog-results-bar">
          <p role="status">
            {data && !error
              ? `${data.total} ${data.total === 1 ? 'Video' : 'Videos'}${selected ? ` · ${selected} Filter aktiv` : ''}`
              : error
                ? 'Katalog nicht verfügbar'
                : 'Katalog wird geladen …'}
          </p>
          {(selected > 0 || query || page > 1) && (
            <button onClick={() => update({}, '')}>Filter zurücksetzen</button>
          )}
        </div>
      </section>
      {error ? (
        <div role="alert">
          <p>Der Videokatalog konnte nicht geladen werden.</p>
          <button onClick={retry}>Erneut versuchen</button>
        </div>
      ) : data && data.items.length === 0 ? (
        <div className="catalog-empty">
          <h2>
            {query || selected || page > 1 ? 'Keine passenden Videos' : 'Die Videothek wächst'}
          </h2>
          <p>
            {query || selected || page > 1
              ? 'Ändere deine Suche oder setze die Filter zurück.'
              : 'Neue Videos erscheinen nach ihrer Veröffentlichung.'}
          </p>
        </div>
      ) : (
        <section className="catalog-grid" aria-label="Videoergebnisse" aria-busy={!data}>
          {(data?.items ?? []).map((video, index) => (
            <VideoCard video={video} index={index} key={video.id} />
          ))}
        </section>
      )}
      {(page > 1 || (data?.total ?? 0) > 24) && (
        <nav className="catalog-pagination" aria-label="Katalogseiten">
          <button disabled={page === 1} onClick={() => update(filters, query, page - 1, true)}>
            Vorherige Seite
          </button>
          <p role="status">
            Seite {page}
            {data ? ` von ${Math.max(1, Math.ceil(data.total / data.limit))}` : ''}
          </p>
          <button
            disabled={!data || error || page >= 10000 || page * data.limit >= data.total}
            onClick={() => update(filters, query, page + 1, true)}
          >
            Nächste Seite
          </button>
        </nav>
      )}
    </main>
  );
}
