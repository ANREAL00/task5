import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { RefreshCw, Play, Table as TableIcon, LayoutGrid, Heart, ChevronDown, ChevronUp, Music, Volume2 } from 'lucide-react';
import { debounce } from 'lodash';
import AlbumCover from './components/AlbumCover';
import MusicPlayer from './components/MusicPlayer';
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
  const sentinelRef = useRef();

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
    const hex = Array.from({ length: 16 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const randomSeed = BigInt(`0x${hex}`).toString();
    handleParamChange('seed', randomSeed);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getLyrics = (title) => {
    return `Every beat reminds me of you, tearing me apart\nIn the million suns that shine, you're the brightest star\nAt the break of dawn, you're all I want, no matter how far\n\nOh ${title.split(' ')[0]}, I try to move on...`;
  }

  const handleViewChange = (mode) => {
    setViewMode(mode);
    setPage(1);
    setExpandedId(null);
    fetchSongs(params, 1, false);
  };

  useEffect(() => {
    if (viewMode !== 'gallery') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loading) {
        setPage(prev => {
          const next = prev + 1;
          fetchSongs(paramsRef.current, next, true);
          return next;
        });
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [viewMode, loading, fetchSongs]);

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
          <button className={`btn-toggle ${viewMode === 'table' ? 'active' : ''}`} onClick={() => handleViewChange('table')}><TableIcon size={18} /></button>
          <button className={`btn-toggle ${viewMode === 'gallery' ? 'active' : ''}`} onClick={() => handleViewChange('gallery')}><LayoutGrid size={18} /></button>
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
                          <Heart size={16} fill="#e65353" color="#f87171" />
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
                            </div>
                            <div className="song-details">
                              <h2>{song.title}</h2>
                              <p className="song-meta">from <span>{song.album}</span> by <span>{song.artist}</span></p>

                              <MusicPlayer song={song} />

                              <div className="lyrics-tabs">
                                <span className="active">Lyrics</span>
                              </div>
                              <div className="lyrics-body">
                                {getLyrics(song.title).split('\n').map((line, i) => (
                                  <p key={i}>{line}</p>
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
          </div>
        ) : (
          <>
            <div className="gallery-grid">
              {data.map((song) => (
                <div key={`${song.id}-${song.mediaSeed}`} className="song-card" onClick={() => {
                  const targetPage = Math.floor((song.id - 1) / 20) + 1;
                  setPage(targetPage);
                  setViewMode('table');
                  setExpandedId(song.id);
                  fetchSongs(params, targetPage, false); // Fetch only the target page
                  window.scrollTo(0, 0);
                }}>
                  <AlbumCover song={song} />
                </div>
              ))}
            </div>
            <div ref={sentinelRef} className="loader-sentinel">
              {loading && (
                <div className="loading-overlay-inline">
                  <RefreshCw size={24} className="spin" color="#3b82f6" />
                  <span>Loading more...</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="loading-overlay">
          <RefreshCw size={40} className="spin" color="#3b82f6" />
          <p>Loading...</p>
        </div>
      )}
    </div>
  );
};

export default App;
