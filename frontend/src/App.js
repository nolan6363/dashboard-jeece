import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Avatar par défaut SVG en base64
const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzY2N2VlYSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjIwIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0yNSA4MCBRIDI1IDYwIDUwIDYwIFEgNzUgNjAgNzUgODAgWiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=';

function App() {
  const [kpi, setKpi] = useState({ chiffre_affaire: 0, objectif_annuel: 100000, objectif_decembre: 0, wr: 0, timestamp: null });
  const [cdps, setCdps] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastModified, setLastModified] = useState(null);

  const fetchData = async () => {
    try {
      const [kpiRes, cdpRes, updateRes] = await Promise.all([
        axios.get(`${API_URL}/kpi`),
        axios.get(`${API_URL}/cdp`),
        axios.get(`${API_URL}/last-update`)
      ]);

      console.log('KPI data received:', kpiRes.data);
      setKpi(kpiRes.data);
      setCdps(cdpRes.data);
      setLastUpdate(updateRes.data.last_update);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const checkForUpdates = async () => {
    try {
      const res = await axios.get(`${API_URL}/last-modified`);
      const newModified = res.data.last_modified;

      if (lastModified !== null && newModified !== lastModified) {
        console.log('Data changed, refreshing...');
        await fetchData();
      }
      setLastModified(newModified);
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  };

  useEffect(() => {
    // Initial load
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Check for updates every 5 seconds (very light request)
    const interval = setInterval(checkForUpdates, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastModified]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="header">
        <div className="logo-container">
          <img src="/images/logo.png" alt="JEECE Logo" className="logo" />
        </div>
        <h1 className="title">Dashboard JEECE</h1>
        <div className="last-update">
          Dernière mise à jour: {formatDateTime(lastUpdate)}
        </div>
      </header>

      <main className="main-content">
        <section className="kpi-section">
          <div className="kpi-card">
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ height: `${Math.min(100, (kpi.chiffre_affaire / (kpi.objectif_annuel || 100000)) * 100)}%` }}
              />

              {/* Marques 25k, 50k, 75k */}
              <div className="progress-marker" style={{ bottom: '25%' }}></div>
              <div className="progress-marker-label" style={{ bottom: '25%', transform: 'translateY(50%)' }}>25k€</div>

              <div className="progress-marker" style={{ bottom: '50%' }}></div>
              <div className="progress-marker-label" style={{ bottom: '50%', transform: 'translateY(50%)' }}>50k€</div>

              <div className="progress-marker" style={{ bottom: '75%' }}></div>
              <div className="progress-marker-label" style={{ bottom: '75%', transform: 'translateY(50%)' }}>75k€</div>

              {/* Objectif déc 2025 */}
              {kpi.objectif_decembre > 0 && (
                <>
                  <div className="progress-line" style={{ bottom: `${Math.min(100, (kpi.objectif_decembre / (kpi.objectif_annuel || 100000)) * 100)}%` }}></div>
                  <div className="progress-line-label" style={{ bottom: `calc(${Math.min(100, (kpi.objectif_decembre / (kpi.objectif_annuel || 100000)) * 100)}% + 5px)` }}>
                    Objectif déc 2025 ({(kpi.objectif_decembre / 1000).toFixed(0)}k€)
                  </div>
                </>
              )}

              {/* WR (World Record) */}
              {kpi.wr > 0 && (
                <>
                  <div className="progress-line wr-line" style={{ bottom: `${Math.min(100, (kpi.wr / (kpi.objectif_annuel || 100000)) * 100)}%` }}></div>
                  <div className="progress-line-label wr-label" style={{ bottom: `calc(${Math.min(100, (kpi.wr / (kpi.objectif_annuel || 100000)) * 100)}% + 5px)` }}>
                    WR ({(kpi.wr / 1000).toFixed(0)}k€)
                  </div>
                </>
              )}
            </div>

            <div className="kpi-content">
              <h2>Chiffre d'Affaires Total</h2>
              <div className="kpi-value">{formatCurrency(kpi.chiffre_affaire)}</div>
              <div className="progress-percentage">
                {Math.min(100, ((kpi.chiffre_affaire / (kpi.objectif_annuel || 100000)) * 100).toFixed(1))}%
              </div>
              <div style={{ fontSize: '1.1rem', opacity: 0.9, marginTop: '15px' }}>
                Objectif: {formatCurrency(kpi.objectif_annuel || 100000)}
              </div>
            </div>
          </div>
        </section>

        <section className="ranking-section">
          <h2 className="section-title">Classement des Chefs de Projet</h2>
          <div className="podium">
            {cdps.slice(0, 3).map((cdp, index) => (
              <div key={cdp.id} className={`podium-item rank-${index + 1}`}>
                <div className="rank-badge">{index + 1}</div>
                <div className="cdp-photo-container">
                  <img
                    src={cdp.photo_filename ? `/images/cdp/${cdp.photo_filename}` : DEFAULT_AVATAR}
                    alt={`${cdp.prenom} ${cdp.nom}`}
                    className="cdp-photo"
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                  />
                </div>
                <div className="cdp-name">{cdp.prenom} {cdp.nom}</div>
                <div className="cdp-ca">{formatCurrency(cdp.chiffre_affaire)}</div>
              </div>
            ))}
          </div>

          <div className="ranking-list">
            {cdps.slice(3).map((cdp, index) => (
              <div key={cdp.id} className="ranking-item">
                <div className="rank-number">{index + 4}</div>
                <div className="cdp-info">
                  <img
                    src={cdp.photo_filename ? `/images/cdp/${cdp.photo_filename}` : DEFAULT_AVATAR}
                    alt={`${cdp.prenom} ${cdp.nom}`}
                    className="cdp-photo-small"
                    onError={(e) => { e.target.onerror = null; e.target.src = DEFAULT_AVATAR; }}
                  />
                  <span className="cdp-name-small">{cdp.prenom} {cdp.nom}</span>
                </div>
                <div className="cdp-ca-small">{formatCurrency(cdp.chiffre_affaire)}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
