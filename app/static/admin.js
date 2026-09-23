// Page d'administration : charge les données, les affiche dans un formulaire,
// et les renvoie au serveur quand on clique sur « Enregistrer ».

let etat = null;       // données en cours d'édition
let modifie = false;   // modifications non enregistrées ?
let indexPhoto = null; // chef de projet dont on change la photo

const formulaire = document.getElementById('formulaire');
const statut = document.getElementById('statut');
const boutonEnregistrer = document.getElementById('enregistrer');
const boutonAnnuler = document.getElementById('annuler');
const choixPhoto = document.getElementById('choix-photo');

// Accepte « 12500 », « 12 500 », « 12500,50 », « 12 500 € ». Renvoie NaN si invalide.
function lireNombre(texte) {
  const nettoye = String(texte).replace(/[\s€  ]/g, '').replace(',', '.');
  const nombre = nettoye === '' ? 0 : Number(nettoye);
  return nombre >= 0 ? nombre : NaN;
}

function ecrireNombre(nombre) {
  return String(nombre ?? 0).replace('.', ',');
}

function afficherStatut(texte, type = '') {
  statut.textContent = texte;
  statut.className = 'statut ' + type;
}

function marquerModifie() {
  modifie = true;
  boutonEnregistrer.disabled = false;
  boutonAnnuler.disabled = false;
  afficherStatut('Modifications non enregistrées', 'attention');
}

// ---------- Affichage du formulaire ----------

function afficherTout() {
  formulaire.querySelectorAll('[data-champ]').forEach((input) => {
    const valeur = etat[input.dataset.champ];
    if (input.type === 'checkbox') input.checked = valeur;
    else input.value = 'nombre' in input.dataset ? ecrireNombre(valeur) : valeur;
  });
  afficherObjectifs();
  afficherChefsProjet();
  mettreAJourTotalAutomatique();
}

function afficherObjectifs() {
  document.getElementById('objectifs').innerHTML = etat.objectifs.map((o, i) => `
    <div class="ligne ligne-objectif" data-liste="objectifs" data-index="${i}">
      <input data-cle="nom" value="${echapper(o.nom)}" placeholder="Nom (ex : Objectif déc.)" aria-label="Nom">
      <input data-cle="valeur" data-nombre value="${ecrireNombre(o.valeur)}" inputmode="decimal" aria-label="Montant (€)">
      <input data-cle="couleur" type="color" value="${o.couleur}" title="Couleur de la ligne">
      <button type="button" class="bouton-supprimer" data-action="supprimer" title="Supprimer">✕</button>
    </div>
  `).join('') || '<p class="vide">Aucun objectif.</p>';
}

function afficherChefsProjet() {
  document.getElementById('nombre-cdp').textContent = `(${etat.chefs_projet.length})`;
  document.getElementById('chefs-projet').innerHTML = etat.chefs_projet.map((cdp, i) => `
    <div class="ligne ligne-cdp" data-liste="chefs_projet" data-index="${i}">
      <button type="button" class="bouton-photo" data-action="photo" title="Changer la photo">
        ${avatar(cdp, 'avatar-admin')}
      </button>
      <input data-cle="prenom" value="${echapper(cdp.prenom)}" placeholder="Prénom" aria-label="Prénom">
      <input data-cle="nom" value="${echapper(cdp.nom)}" placeholder="Nom" aria-label="Nom">
      <input data-cle="chiffre_affaire" data-nombre value="${ecrireNombre(cdp.chiffre_affaire)}" inputmode="decimal" aria-label="Chiffre d'affaires (€)">
      <button type="button" class="bouton-supprimer" data-action="supprimer" title="Supprimer">✕</button>
    </div>
  `).join('') || '<p class="vide">Aucun chef de projet.</p>';
}

function mettreAJourTotalAutomatique() {
  const input = formulaire.querySelector('[data-champ="chiffre_affaire_total"]');
  input.disabled = etat.total_automatique;
  if (etat.total_automatique) {
    const somme = etat.chefs_projet.reduce((total, cdp) => total + (lireNombre(cdp.chiffre_affaire) || 0), 0);
    input.value = ecrireNombre(Math.round(somme * 100) / 100);
    input.classList.remove('invalide');
  }
}

// ---------- Modifications ----------

formulaire.addEventListener('input', (e) => {
  const input = e.target;
  const valeur = input.type === 'checkbox' ? input.checked : input.value;
  if ('nombre' in input.dataset) {
    input.classList.toggle('invalide', Number.isNaN(lireNombre(valeur)));
  }

  if (input.dataset.champ) {
    etat[input.dataset.champ] = valeur;
  } else if (input.dataset.cle) {
    const ligne = input.closest('[data-liste]');
    etat[ligne.dataset.liste][ligne.dataset.index][input.dataset.cle] = valeur;
  }
  mettreAJourTotalAutomatique();
  marquerModifie();
});

formulaire.addEventListener('click', (e) => {
  const bouton = e.target.closest('[data-action]');
  if (!bouton) return;
  const ligne = bouton.closest('[data-liste]');

  switch (bouton.dataset.action) {
    case 'ajouter-objectif':
      etat.objectifs.push({ nom: '', valeur: 0, couleur: '#ffffff' });
      afficherObjectifs();
      focaliserDerniereLigne('objectifs');
      break;
    case 'ajouter-cdp':
      etat.chefs_projet.push({ prenom: '', nom: '', chiffre_affaire: 0, photo: null });
      afficherChefsProjet();
      focaliserDerniereLigne('chefs-projet');
      break;
    case 'supprimer': {
      const liste = etat[ligne.dataset.liste];
      const element = liste[ligne.dataset.index];
      const nom = element.nom || element.prenom ? `« ${[element.prenom, element.nom].filter(Boolean).join(' ')} »` : 'cette ligne';
      if (!window.confirm(`Supprimer ${nom} ?`)) return;
      liste.splice(ligne.dataset.index, 1);
      afficherObjectifs();
      afficherChefsProjet();
      mettreAJourTotalAutomatique();
      break;
    }
    case 'photo':
      indexPhoto = Number(ligne.dataset.index);
      choixPhoto.value = '';
      choixPhoto.click();
      return;
  }
  marquerModifie();
});

function focaliserDerniereLigne(id) {
  const lignes = document.getElementById(id).querySelectorAll('.ligne');
  const input = lignes[lignes.length - 1].querySelector('input');
  input.scrollIntoView({ block: 'center' });
  input.focus();
}

// ---------- Photos ----------

choixPhoto.addEventListener('change', async () => {
  const fichier = choixPhoto.files[0];
  if (!fichier || indexPhoto === null) return;
  afficherStatut('Envoi de la photo…');
  try {
    const image = await redimensionner(fichier);
    const envoi = new FormData();
    envoi.append('photo', image, 'photo.jpg');
    const reponse = await fetch('/api/photos', { method: 'POST', body: envoi });
    const resultat = await reponse.json();
    if (!reponse.ok) throw new Error(resultat.erreur);
    etat.chefs_projet[indexPhoto].photo = resultat.photo;
    afficherChefsProjet();
    marquerModifie();
  } catch (e) {
    afficherStatut(`Photo non envoyée : ${e.message || 'image illisible (utilise un JPG ou un PNG)'}`, 'erreur');
  }
});

// Recadre la photo en carré et la réduit à 400x400 avant l'envoi :
// fichier léger, affichage rapide sur la Raspberry Pi.
async function redimensionner(fichier, taille = 400) {
  const url = URL.createObjectURL(fichier);
  try {
    const image = await new Promise((ok, erreur) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => erreur(new Error('image illisible (utilise un JPG ou un PNG)'));
      img.src = url;
    });
    const cote = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = Math.min(taille, cote);
    const contexte = canvas.getContext('2d');
    contexte.fillStyle = '#ffffff';
    contexte.fillRect(0, 0, canvas.width, canvas.height);
    contexte.drawImage(image,
      (image.naturalWidth - cote) / 2, (image.naturalHeight - cote) / 2, cote, cote,
      0, 0, canvas.width, canvas.height);
    return await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------- Chargement / enregistrement ----------

async function charger() {
  try {
    const reponse = await fetch('/api/donnees', { cache: 'no-store' });
    etat = (await reponse.json()).donnees;
    afficherTout();
    formulaire.hidden = false;
    modifie = false;
    boutonEnregistrer.disabled = true;
    boutonAnnuler.disabled = true;
    afficherStatut(`Dernière mise à jour : ${dateHeure(etat.mis_a_jour_le)}`);
  } catch (e) {
    afficherStatut('Impossible de charger les données. Le serveur est-il démarré ?', 'erreur');
  }
}

async function enregistrer() {
  const invalide = formulaire.querySelector('.invalide');
  if (invalide) {
    invalide.focus();
    afficherStatut('Un montant est invalide (en rouge).', 'erreur');
    return;
  }
  boutonEnregistrer.disabled = true;
  afficherStatut('Enregistrement…');
  try {
    const reponse = await fetch('/api/donnees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(etat),
    });
    const resultat = await reponse.json();
    if (!reponse.ok) throw new Error(resultat.erreur);
    etat = resultat.donnees;
    afficherTout();
    modifie = false;
    boutonAnnuler.disabled = true;
    afficherStatut('✓ Enregistré. Le dashboard se met à jour dans quelques secondes.', 'succes');
  } catch (e) {
    boutonEnregistrer.disabled = false;
    afficherStatut(`Erreur : ${e.message || 'serveur injoignable'}`, 'erreur');
  }
}

boutonEnregistrer.addEventListener('click', enregistrer);

boutonAnnuler.addEventListener('click', () => {
  if (window.confirm('Annuler toutes les modifications non enregistrées ?')) charger();
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    if (modifie) enregistrer();
  }
});

window.addEventListener('beforeunload', (e) => {
  if (modifie) e.preventDefault();
});

charger();
