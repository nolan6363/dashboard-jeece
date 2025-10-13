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
  const [newCdp, setNewCdp] = useState({
    nom: '',
    prenom: '',
    photo_filename: '',
    chiffre_affaire: 0
  });
  const [photoFile, setPhotoFile] = useState(null);

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setNewCdp({
        ...newCdp,
        photo_filename: file.name
      });
    }
  };

  const handleAddCdp = async () => {
    if (!newCdp.nom || !newCdp.prenom) {
      setMessage('❌ Le nom et le prénom sont obligatoires');
      return;
    }

    let photoFilename = newCdp.photo_filename;

    // Upload photo if one was selected
    if (photoFile) {
      try {
        const formData = new FormData();
        formData.append('photo', photoFile);

        const response = await fetch('/api/admin/upload-photo', {
          method: 'POST',
          body: formData
        });

        if (response.ok) {
          const result = await response.json();
          photoFilename = result.filename;
        } else {
          setMessage('⚠️ Erreur lors de l\'upload de la photo, CDP ajouté sans photo');
          photoFilename = '';
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        setMessage('⚠️ Erreur lors de l\'upload de la photo, CDP ajouté sans photo');
        photoFilename = '';
      }
    }

    const cdpToAdd = {
      ...newCdp,
      photo_filename: photoFilename
    };

    const updatedChefsProjet = [...config.chefs_projet, cdpToAdd];
    setConfig({
      ...config,
      chefs_projet: updatedChefsProjet
    });

    // Reset form
    setNewCdp({
      nom: '',
      prenom: '',
      photo_filename: '',
      chiffre_affaire: 0
    });
    setPhotoFile(null);

    // Reset file input
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';

    setMessage('✅ CDP ajouté avec succès ! N\'oubliez pas de sauvegarder.');
  };

  const handleRemoveCdp = (index) => {
    const updatedChefsProjet = config.chefs_projet.filter((_, i) => i !== index);
    setConfig({
      ...config,
      chefs_projet: updatedChefsProjet
    });
    setMessage('✅ CDP supprimé. N\'oubliez pas de sauvegarder.');
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
          <h2>➕ Ajouter un nouveau CDP</h2>
          <div className="add-cdp-form">
            <div className="form-row">
              <div className="input-group">
                <label>Nom *</label>
                <input
                  type="text"
                  value={newCdp.nom}
                  onChange={(e) => setNewCdp({ ...newCdp, nom: e.target.value })}
                  placeholder="Nom du CDP"
                />
              </div>
              <div className="input-group">
                <label>Prénom *</label>
                <input
                  type="text"
                  value={newCdp.prenom}
                  onChange={(e) => setNewCdp({ ...newCdp, prenom: e.target.value })}
                  placeholder="Prénom du CDP"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="input-group">
                <label>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                />
                {photoFile && <span className="file-name">📷 {photoFile.name}</span>}
              </div>
              <div className="input-group">
                <label>Chiffre d'affaires initial (€)</label>
                <input
                  type="number"
                  value={newCdp.chiffre_affaire}
                  onChange={(e) => setNewCdp({ ...newCdp, chiffre_affaire: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                  placeholder="0"
                />
              </div>
            </div>
            <button className="btn-add-cdp" onClick={handleAddCdp}>
              ➕ Ajouter le CDP
            </button>
          </div>
        </section>

        <section className="admin-section">
          <h2>👥 Chiffre d'Affaires par CDP</h2>
          <div className="cdp-grid">
            {config.chefs_projet.map((cdp, index) => (
              <div key={index} className="cdp-item">
                <button
                  className="btn-remove-cdp"
                  onClick={() => handleRemoveCdp(index)}
                  title="Supprimer ce CDP"
                >
                  ✕
                </button>
                <label>{cdp.prenom} {cdp.nom}</label>
                {cdp.photo_filename && <span className="photo-indicator">📷 {cdp.photo_filename}</span>}
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
