import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Play, Table as TableIcon, LayoutGrid, Heart, ChevronDown, ChevronUp, Music, Volume2 } from 'lucide-react';
import { debounce } from 'lodash';
import AlbumCover from './components/AlbumCover';
import './index.css';

const API_BASE = 'http://localhost:3001/api';

const App = () => {
  const [params, setParams] = useState({
    seed: '42',
    locale: 'en_US',
    likes: 5.0,
  });
  const [viewMode, setViewMode] = useState('table');
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const paramsRef = useRef(params);
  const isFetchingRef = useRef(false);

  const fetchSongs = useCallback(async (currentParams, currentPage, append = false) => {
    if (isFetchingRef.current && append) return;
    isFetchingRef.current = true;
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/songs`, {
        params: { ...currentParams, page: currentPage }
      });
      setData(prev => {
        if (!append) return response.data;
        const existingIds = new Set(prev.map(s => s.id));
        const newSongs = response.data.filter(s => !existingIds.has(s.id));
        return [...prev, ...newSongs];
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, []);

  const debouncedFetch = useMemo(() =>
    debounce((p) => {
      setPage(1);
      fetchSongs(p, 1, false);
    }, 400),
    [fetchSongs]
  );

  useEffect(() => {
    if (params.locale !== paramsRef.current?.locale) {
      setData([]);
    }
    setPage(1);
    setExpandedId(null);
    debouncedFetch(params);
    paramsRef.current = params;
    return () => debouncedFetch.cancel();
  }, [params, debouncedFetch]);

  const handleParamChange = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const generateRandomSeed = () => {
    const randomSeed = Math.floor(Math.random() * 1000000).toString();
    handleParamChange('seed', randomSeed);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getLyrics = (title) => {
    return `Every beat reminds me of you, tearing me apart\nIn the million suns that shine, you're the brightest star\nAt the break of dawn, you're all I want, no matter how far\n\nOh ${title.split(' ')[0]}, I try to move on...`;
  }

  return (
    <div className="app-container">
      <div className="toolbar">
        <div className="control-group">
          <label>Language</label>
          <select className="control-input" value={params.locale} onChange={(e) => handleParamChange('locale', e.target.value)}>
            <option value="en_US">English (US)</option>
            <option value="pl_PL">Polish (PL)</option>
          </select>
        </div>

        <div className="control-group">
          <label>Seed</label>
          <div className="seed-container">
            <input type="text" className="control-input" value={params.seed} onChange={(e) => handleParamChange('seed', e.target.value)} />
            <RefreshCw size={16} className="refresh-icon" style={{ cursor: 'pointer' }} onClick={generateRandomSeed} />
          </div>
        </div>

        <div className="control-group" style={{ flexGrow: 0.5 }}>
          <label>Likes: {params.likes.toFixed(1)}</label>
          <input type="range" min="0" max="10" step="0.1" style={{ width: '200px' }} value={params.likes} onChange={(e) => handleParamChange('likes', parseFloat(e.target.value))} />
        </div>

        <div className="view-toggle">
          <button className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><TableIcon size={18} /></button>
          <button className={`btn-toggle ${viewMode === 'gallery' ? 'active' : ''}`} onClick={() => setViewMode('gallery')}><LayoutGrid size={18} /></button>
        </div>
      </div>

      <div className="content-area">
        {viewMode === 'table' ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Song</th>
                  <th>Artist</th>
                  <th>Album</th>
                  <th>Genre</th>
                  <th style={{ width: '100px' }}>Likes</th>
                </tr>
              </thead>
              <tbody>
                {data.map((song) => (
                  <React.Fragment key={`${song.id}-${song.mediaSeed}`}>
                    <tr onClick={() => toggleExpand(song.id)} className={expandedId === song.id ? 'expanded-row' : ''} style={{ cursor: 'pointer' }}>
                      <td>
                        <div className="id-cell-wrapper">
                          {expandedId === song.id ? <ChevronUp size={16} color="#3b82f6" /> : <ChevronDown size={16} color="#94a3b8" />}
                          <strong>{song.id}</strong>
                        </div>
                      </td>
                      <td>{song.title}</td>
                      <td>{song.artist}</td>
                      <td style={{ color: song.album === 'Single' ? '#cbd5e1' : 'inherit' }}>{song.album}</td>
                      <td>{song.genre}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Heart size={14} fill="#f87171" color="#f87171" />
                          <span>{song.likes}</span>
                        </div>
                      </td>
                    </tr>
                    {expandedId === song.id && (
                      <tr className="expanded-row">
                        <td colSpan="6">
                          <div className="expanded-content">
                            <div className="cover-art-container">
                              <AlbumCover song={song} />
                              <div className="likes-badge" style={{ marginTop: '0.5rem' }}>
                                <Heart size={14} fill="#f87171" color="#f87171" style={{ marginRight: '0.3rem' }} />
                                <span style={{ fontWeight: 700, color: '#1e293b' }}>{song.likes}</span>
                              </div>
                            </div>
                            <div className="song-details">
                              <h2>{song.title}</h2>
                              <p className="song-meta">from <span>{song.album}</span> by <span>{song.artist}</span></p>

                              <div className="player-controls">
                                <Play size={24} fill="#3b82f6" color="#3b82f6" style={{ cursor: 'pointer' }} />
                                <Volume2 size={20} color="#94a3b8" />
                                <div className="progress-bar">
                                  <div className="progress-filled"></div>
                                </div>
                                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>2:12</span>
                              </div>

                              <div className="lyrics-tabs">
                                <span className="active">Lyrics</span>
                              </div>
                              <div className="lyrics-body">
                                {getLyrics(song.title).split('\n').map((line, i) => (
                                  <p key={i} style={{ fontWeight: i === 2 ? 700 : 400 }}>{line}</p>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="gallery-grid">
            {data.map((song) => (
              <div key={`${song.id}-${song.mediaSeed}`} className="song-card" onClick={() => {
                setViewMode('table');
                setExpandedId(song.id);
                window.scrollTo(0, 0);
              }}>
                <AlbumCover song={song} />
                <h3>{song.title}</h3>
                <p>{song.artist}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pagination">
        <button className="btn-page" disabled={page === 1} onClick={() => { setPage(page - 1); fetchSongs(params, page - 1); }}>«</button>
        {[...Array(3)].map((_, i) => (
          <button
            key={i}
            className={`btn-page ${page === page + i - (page > 1 ? 1 : 0) ? 'active' : ''}`}
            onClick={() => {
              const targetPage = page + i - (page > 1 ? 1 : 0);
              setPage(targetPage);
              fetchSongs(params, targetPage);
            }}
          >
            {page + i - (page > 1 ? 1 : 0)}
          </button>
        ))}
        <button className="btn-page" onClick={() => { setPage(page + 1); fetchSongs(params, page + 1); }}>»</button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <RefreshCw size={40} className="spin" color="#3b82f6" />
          <p>Syncing beats...</p>
        </div>
      )}
    </div>
  );
};

export default App;
