import React, { useState, useEffect } from 'react';
import './Admin.css';

function Admin() {
  const [config, setConfig] = useState({
    objectif_annuel: 100000,
    chiffre_affaire_total: 0,
    chefs_projet: []
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/admin/config');
      const data = await response.json();
      setConfig(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching config:', error);
      setMessage('❌ Erreur lors du chargement des données');
      setLoading(false);
    }
  };

  const handleObjectifChange = (e) => {
    setConfig({
      ...config,
      objectif_annuel: parseFloat(e.target.value) || 0
    });
  };

  const handleTotalChange = (e) => {
    setConfig({
      ...config,
      chiffre_affaire_total: parseFloat(e.target.value) || 0
    });
  };

  const handleCdpChange = (index, value) => {
    const updatedCdp = [...config.chefs_projet];
    updatedCdp[index].chiffre_affaire = parseFloat(value) || 0;
    setConfig({
      ...config,
      chefs_projet: updatedCdp
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setMessage('✅ Données sauvegardées avec succès !');
        // Trigger a sync to update the database
        await fetch('/api/sync', { method: 'POST' });
      } else {
        setMessage('❌ Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      setMessage('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const calculateTotal = () => {
    const sum = config.chefs_projet.reduce((acc, cdp) => acc + (cdp.chiffre_affaire || 0), 0);
    setConfig({
      ...config,
      chiffre_affaire_total: sum
    });
  };

  if (loading) {
    return <div className="admin-container"><p>Chargement...</p></div>;
  }

  return (
    <div className="admin-container">
      <header className="admin-header">
        <h1>🔧 Administration Dashboard JEECE</h1>
        <a href="/" className="btn-back">← Retour au Dashboard</a>
      </header>

      <div className="admin-content">
        {message && <div className="message">{message}</div>}

        <section className="admin-section">
          <h2>📊 Objectif Annuel</h2>
          <div className="input-group">
            <label>Objectif (€)</label>
            <input
              type="number"
              value={config.objectif_annuel}
              onChange={handleObjectifChange}
              min="0"
              step="1000"
            />
          </div>
        </section>

        <section className="admin-section">
          <h2>💰 Chiffre d'Affaires Total</h2>
          <div className="input-group">
            <label>CA Total (€)</label>
            <input
              type="number"
              value={config.chiffre_affaire_total}
              onChange={handleTotalChange}
              min="0"
              step="100"
            />
          </div>
          <button
            className="btn-calculate"
            onClick={calculateTotal}
            type="button"
          >
            🧮 Calculer automatiquement (somme des CDP)
          </button>
        </section>

        <section className="admin-section">
          <h2>👥 Chiffre d'Affaires par CDP</h2>
          <div className="cdp-grid">
            {config.chefs_projet.map((cdp, index) => (
              <div key={index} className="cdp-item">
                <label>{cdp.prenom} {cdp.nom}</label>
                <input
                  type="number"
                  value={cdp.chiffre_affaire}
                  onChange={(e) => handleCdpChange(index, e.target.value)}
                  min="0"
                  step="100"
                  placeholder="0"
                />
                <span className="currency">€</span>
              </div>
            ))}
          </div>
        </section>

        <div className="admin-actions">
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les modifications'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Admin;
