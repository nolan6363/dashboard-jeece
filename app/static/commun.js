// Fonctions partagées entre le dashboard et la page admin.

const formatEuros = new Intl.NumberFormat('fr-FR', {
  style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
});

function euros(montant) {
  return formatEuros.format(montant || 0);
}

// 42000 -> "42k€", 37500 -> "37,5k€"
function kiloEuros(montant) {
  return (Math.round(montant / 100) / 10).toLocaleString('fr-FR') + 'k€';
}

function dateHeure(iso) {
  if (!iso) return '–';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function echapper(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function initiales(cdp) {
  return ((cdp.prenom || '').charAt(0) + (cdp.nom || '').charAt(0)).toUpperCase() || '?';
}

// Photo du CDP, ou ses initiales s'il n'en a pas (ou si le fichier est introuvable).
function avatar(cdp, classe) {
  const lettres = echapper(initiales(cdp));
  if (cdp.photo) {
    return `<img class="avatar ${classe}" src="/photos/${encodeURIComponent(cdp.photo)}" alt="" data-initiales="${lettres}">`;
  }
  return `<span class="avatar avatar-initiales ${classe}">${lettres}</span>`;
}

document.addEventListener('error', (e) => {
  const img = e.target;
  if (img.tagName === 'IMG' && img.dataset.initiales) {
    const remplacement = document.createElement('span');
    remplacement.className = img.className + ' avatar-initiales';
    remplacement.textContent = img.dataset.initiales;
    img.replaceWith(remplacement);
  }
}, true);
