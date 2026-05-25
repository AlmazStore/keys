// Lógica do Painel Administrativo de Keys ALMAZ

const API_URL = 'https://keys-server-9zq2.onrender.com';

// Elementos da DOM
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.content-section');
const toastContainer = document.getElementById('toast-container');

// Elementos do Dashboard
const statTotal = document.getElementById('stat-total');
const statActive = document.getElementById('stat-active');
const statExpired = document.getElementById('stat-expired');
const statRevoked = document.getElementById('stat-revoked');
const recentKeysTbody = document.getElementById('recent-keys-tbody');

// Elementos do Gerenciamento de Keys
const keysTbody = document.getElementById('keys-tbody');
const searchInput = document.getElementById('search-input');
const statusFilter = document.getElementById('status-filter');

// Elementos do Gerador
const generatorForm = document.getElementById('generator-form');
const genDaysInput = document.getElementById('gen-days');
const genClientInput = document.getElementById('gen-client');
const genNotesInput = document.getElementById('gen-notes');
const genQtyInput = document.getElementById('gen-qty');
const quickButtons = document.querySelectorAll('.btn-quick');
const resultCard = document.getElementById('generator-result-card');
const generatedKeysList = document.getElementById('generated-keys-list');
const copyAllBtn = document.getElementById('copy-all-btn');

// Elementos do Modal de Renovação
const renewModal = document.getElementById('renew-modal');
const closeRenewModal = document.getElementById('close-renew-modal');
const btnCancelRenew = document.getElementById('btn-cancel-renew');
const btnConfirmRenew = document.getElementById('btn-confirm-renew');
const renewDaysInput = document.getElementById('renew-days');
const renewKeyIdInput = document.getElementById('renew-key-id');

// Estado Global
let allKeys = [];
let generatedKeysGlobal = [];

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  setupNavigation();
  setupQuickButtons();
  setupGenerator();
  setupFilters();
  setupRenewModal();
  
  // Carregar dados iniciais
  refreshAllData();
  
  // Auto-refresh a cada 30 segundos
  setInterval(refreshAllData, 30000);
});

// Toast System
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'warning') icon = '⚠️';
  if (type === 'error') icon = '❌';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Navegação entre Abas
function setupNavigation() {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      
      navItems.forEach(i => i.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      item.classList.add('active');
      document.getElementById(target).classList.add('active');
      
      // Carregar os dados correspondentes
      refreshAllData();
    });
  });
}

// Quick Buttons do Gerador
function setupQuickButtons() {
  quickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const days = btn.getAttribute('data-days');
      genDaysInput.value = days;
    });
  });
}

// Configurar o Gerador
function setupGenerator() {
  generatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const days = genDaysInput.value;
    const clientName = genClientInput.value;
    const notes = genNotesInput.value;
    const quantity = genQtyInput.value;
    
    try {
      const response = await fetch(`${API_URL}/api/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, clientName, notes, quantity })
      });
      
      if (!response.ok) throw new Error('Falha ao gerar chaves.');
      
      const createdKeys = await response.json();
      generatedKeysGlobal = createdKeys.map(k => k.key);
      
      // Renderizar chaves geradas
      generatedKeysList.innerHTML = '';
      createdKeys.forEach(k => {
        const item = document.createElement('div');
        item.className = 'generated-key-item';
        item.innerHTML = `
          <span>${k.key}</span>
          <button class="btn-secondary" onclick="copyText('${k.key}')">Copiar</button>
        `;
        generatedKeysList.appendChild(item);
      });
      
      resultCard.style.display = 'block';
      showToast(`${createdKeys.length} chave(s) gerada(s) com sucesso!`, 'success');
      
      // Resetar form parcialmente
      genClientInput.value = '';
      genNotesInput.value = '';
      genQtyInput.value = '1';
      
      refreshAllData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
  
  copyAllBtn.addEventListener('click', () => {
    if (generatedKeysGlobal.length === 0) return;
    const allText = generatedKeysGlobal.join('\n');
    navigator.clipboard.writeText(allText).then(() => {
      showToast('Todas as chaves copiadas!', 'success');
    }).catch(() => {
      showToast('Erro ao copiar chaves.', 'error');
    });
  });
}

// Copiar texto individual
window.copyText = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Chave copiada para a área de transferência!', 'success');
  }).catch(() => {
    showToast('Erro ao copiar chave.', 'error');
  });
};

// Filtros de busca
function setupFilters() {
  searchInput.addEventListener('input', renderKeysTable);
  statusFilter.addEventListener('change', renderKeysTable);
}

// Modal de Renovação
function setupRenewModal() {
  const close = () => {
    renewModal.style.display = 'none';
  };
  
  closeRenewModal.addEventListener('click', close);
  btnCancelRenew.addEventListener('click', close);
  
  btnConfirmRenew.addEventListener('click', async () => {
    const key = renewKeyIdInput.value;
    const days = renewDaysInput.value;
    
    if (!days || parseInt(days) <= 0) {
      showToast('Insira uma quantidade de dias válida.', 'warning');
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/keys/${key}/renew`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days })
      });
      
      if (!response.ok) throw new Error('Falha ao renovar chave.');
      
      showToast(`Licença ${key} renovada por mais ${days} dias!`, 'success');
      close();
      refreshAllData();
    } catch (error) {
      showToast(error.message, 'error');
    }
  });
}

// Atualizar tudo
async function refreshAllData() {
  try {
    // Buscar estatísticas
    const statsRes = await fetch(`${API_URL}/api/stats`);
    if (statsRes.ok) {
      const stats = await statsRes.json();
      statTotal.textContent = stats.total;
      statActive.textContent = stats.active;
      statExpired.textContent = stats.expired;
      statRevoked.textContent = stats.revoked;
    }
    
    // Buscar keys
    const keysRes = await fetch(`${API_URL}/api/keys`);
    if (keysRes.ok) {
      allKeys = await keysRes.json();
      renderDashboardRecent();
      renderKeysTable();
    }
  } catch (error) {
    console.error('Erro ao buscar dados do servidor:', error);
  }
}

// Formatar data em formato brasileiro
function formatDate(isoString) {
  if (!isoString) return 'Nunca';
  const date = new Date(isoString);
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Calcular dias restantes
function getDaysRemaining(expiresAt) {
  if (!expiresAt) return '<span style="color:#a855f7; font-weight:bold;">Lifetime</span>';
  
  const expiry = new Date(expiresAt);
  const now = new Date();
  
  if (now > expiry) return '<span style="color:var(--danger)">Expirado</span>';
  
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 1) return '1 dia';
  return `${diffDays} dias`;
}

// Renderizar Tabela do Dashboard (Chaves Recentes)
function renderDashboardRecent() {
  // Pegar as 5 chaves criadas por último
  const sorted = [...allKeys].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  
  recentKeysTbody.innerHTML = '';
  
  if (sorted.length === 0) {
    recentKeysTbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Nenhuma key criada ainda.</td></tr>`;
    return;
  }
  
  sorted.forEach(k => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="key-code">${k.key}</span></td>
      <td>${k.clientName}</td>
      <td><span class="badge badge-${k.status}">${translateStatus(k.status)}</span></td>
      <td>${formatDate(k.createdAt)}</td>
    `;
    recentKeysTbody.appendChild(tr);
  });
}

// Traduzir status
function translateStatus(status) {
  if (status === 'active') return 'Ativa';
  if (status === 'expired') return 'Expirada';
  if (status === 'revoked') return 'Revogada';
  return status;
}

// Renderizar Tabela Completa de Keys
function renderKeysTable() {
  const searchTerm = searchInput.value.toLowerCase();
  const filterVal = statusFilter.value;
  
  const filtered = allKeys.filter(k => {
    const matchesSearch = 
      k.key.toLowerCase().includes(searchTerm) || 
      k.clientName.toLowerCase().includes(searchTerm) || 
      (k.hwid && k.hwid.toLowerCase().includes(searchTerm));
      
    const matchesStatus = filterVal === 'all' || k.status === filterVal;
    
    return matchesSearch && matchesStatus;
  });
  
  keysTbody.innerHTML = '';
  
  if (filtered.length === 0) {
    keysTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted);">Nenhuma chave encontrada.</td></tr>`;
    return;
  }
  
  // Ordenar por data de criação decrescente
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  filtered.forEach(k => {
    const tr = document.createElement('tr');
    
    const hwidText = k.hwid 
      ? `<span title="${k.hwid}">${k.hwid.substring(0, 10)}...</span>` 
      : '<span style="color:var(--text-muted);">Livre</span>';
      
    tr.innerHTML = `
      <td>
        <span class="key-code">${k.key}</span>
        <button class="btn-action btn-copy" title="Copiar Key" onclick="copyText('${k.key}')">📋</button>
      </td>
      <td><span class="badge badge-${k.status}">${translateStatus(k.status)}</span></td>
      <td><strong style="color:#fff">${k.clientName}</strong>${k.notes ? `<br><small style="color:var(--text-muted)">${k.notes}</small>` : ''}</td>
      <td>${getDaysRemaining(k.expiresAt)}</td>
      <td>${hwidText}</td>
      <td>${formatDate(k.createdAt)}</td>
      <td>
        <button class="btn-action btn-renew" title="Adicionar Dias" onclick="openRenewModal('${k.key}')">⏳</button>
        <button class="btn-action btn-reset" title="Resetar HWID" onclick="resetHwid('${k.key}')">🔄</button>
        <button class="btn-action btn-revoke" title="Revogar Licença" onclick="revokeKey('${k.key}')">🚫</button>
        <button class="btn-action btn-delete" title="Excluir Permanentemente" onclick="deleteKey('${k.key}')">🗑️</button>
      </td>
    `;
    keysTbody.appendChild(tr);
  });
}

// Ações Globais expostas na window

window.openRenewModal = function(key) {
  renewKeyIdInput.value = key;
  renewDaysInput.value = '30';
  renewModal.style.display = 'flex';
};

window.resetHwid = async function(key) {
  if (!confirm(`Deseja mesmo resetar o HWID da chave ${key}? O cliente poderá usá-la em outro PC.`)) return;
  
  try {
    const res = await fetch(`${API_URL}/api/keys/${key}/reset-hwid`, { method: 'PUT' });
    if (!res.ok) throw new Error();
    showToast('HWID resetado com sucesso!', 'success');
    refreshAllData();
  } catch {
    showToast('Erro ao resetar HWID.', 'error');
  }
};

window.revokeKey = async function(key) {
  if (!confirm(`Deseja mesmo revogar a licença da chave ${key}?`)) return;
  
  try {
    const res = await fetch(`${API_URL}/api/keys/${key}/revoke`, { method: 'PUT' });
    if (!res.ok) throw new Error();
    showToast('Licença revogada com sucesso!', 'warning');
    refreshAllData();
  } catch {
    showToast('Erro ao revogar chave.', 'error');
  }
};

window.deleteKey = async function(key) {
  if (!confirm(`Deseja mesmo EXCLUIR permanentemente a chave ${key}? Esta ação não pode ser desfeita.`)) return;
  
  try {
    const res = await fetch(`${API_URL}/api/keys/${key}`, { method: 'DELETE' });
    if (!res.ok) throw new Error();
    showToast('Chave excluída com sucesso!', 'success');
    refreshAllData();
  } catch {
    showToast('Erro ao excluir chave.', 'error');
  }
};
