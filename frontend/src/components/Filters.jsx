import { Search, X, RotateCcw, Filter } from 'lucide-react';

export default function Filters({ bands, setBands, category, setCategory, status, setStatus, search, setSearch, categories, onClear }) {
  const all = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const toggle = (band) => setBands(bands.includes(band) ? bands.filter((item) => item !== band) : [...bands, band]);
  return <div className="controls-bar">
    <div className="filter-group"><span className="filter-label"><Filter size={14} /> Risk Band:</span><div className="filter-pills">
      <button className={`filter-pill ${bands.length === 4 ? 'active' : ''}`} onClick={() => setBands(bands.length === 4 ? ['CRITICAL'] : all)}>All <span className="pill-count">{all.length}</span></button>
      {all.map((band) => <button key={band} className={`filter-pill ${band.toLowerCase()} ${bands.includes(band) ? 'active' : ''}`} onClick={() => toggle(band)}>{band}</button>)}
    </div></div>
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      <select className="select-dropdown" value={category} onChange={(e) => setCategory(e.target.value)}>{categories.map((item) => <option key={item} value={item}>{item === 'ALL' ? 'All Categories' : item}</option>)}</select>
      <select className="select-dropdown" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">All Statuses</option><option>In Progress</option><option>Complete</option></select>
      <div className="search-box"><Search size={14} color="var(--text-muted)" /><input className="search-input" placeholder="Search Work ID, Agency..." value={search} onChange={(e) => setSearch(e.target.value)} />{search && <button className="icon-button" onClick={() => setSearch('')}><X size={14} /></button>}</div>
      <button className="btn-clear" onClick={onClear}><RotateCcw size={12} /> Clear</button>
    </div>
  </div>;
}