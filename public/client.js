// LOGICA PORTAL DO CLIENTE - ALMAZ

const API_URL = window.location.origin;

// Elementos DOM
const authCard = document.getElementById('auth-card');
const loginSection = document.getElementById('login-section');
const registerSection = document.getElementById('register-section');
const dashboardSection = document.getElementById('dashboard-section');

// Botoes de Navegacao
const goToRegister = document.getElementById('go-to-register');
const goToLogin = document.getElementById('go-to-login');

// Formularios
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Inputs
const loginUserInp = document.getElementById('login-username');
const loginPassInp = document.getElementById('login-password');
const regUserInp = document.getElementById('reg-username');
const regEmailInp = document.getElementById('reg-email');
const regPassInp = document.getElementById('reg-password');

// Dashboard Area
const userDisplayName = document.getElementById('user-display-name');
const clientKeyDisplay = document.getElementById('client-key-display');
const copyKeyBtn = document.getElementById('copy-key-btn');
const btnLogout = document.getElementById('btn-logout');

// Toast Container
const toastContainer = document.getElementById('toast-container');

// Inicializacao
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se o usuario ja esta logado
  const savedUser = localStorage.getItem('almaz_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      showDashboard(user);
    } catch (e) {
      localStorage.removeItem('almaz_user');
      showSection('login');
    }
  } else {
    showSection('login');
  }
});

// Chaveador de Telas
goToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  showSection('register');
});

goToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  showSection('login');
});

// Acao de Enviar Cadastro
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = regUserInp.value.trim();
  const email = regEmailInp.value.trim();
  const password = regPassInp.value;

  if (!username || !email || !password) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/client/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(data.message, 'success');
      
      const sessionUser = {
        username: data.user.username,
        email: email,
        assignedKey: data.user.assignedKey
      };
      
      localStorage.setItem('almaz_user', JSON.stringify(sessionUser));
      setTimeout(() => {
        showDashboard(sessionUser);
      }, 1000);
      
      // Limpar campos
      registerForm.reset();
    } else {
      showToast(data.message || 'Erro ao criar conta.', 'error');
      triggerShake();
    }
  } catch (error) {
    console.error('Erro de registro:', error);
    showToast('Não foi possível conectar ao servidor.', 'error');
    triggerShake();
  }
});

// Acao de Enviar Login
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = loginUserInp.value.trim();
  const password = loginPassInp.value;

  if (!username || !password) {
    showToast('Preencha todos os campos.', 'error');
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      showToast(data.message, 'success');
      localStorage.setItem('almaz_user', JSON.stringify(data.user));
      
      setTimeout(() => {
        showDashboard(data.user);
      }, 1000);
      
      // Limpar campos
      loginForm.reset();
    } else {
      showToast(data.message || 'Dados inválidos.', 'error');
      triggerShake();
    }
  } catch (error) {
    console.error('Erro de login:', error);
    showToast('Não foi possível conectar ao servidor.', 'error');
    triggerShake();
  }
});

// Acao de Copiar Key
copyKeyBtn.addEventListener('click', () => {
  const key = clientKeyDisplay.textContent;
  if (!key || key.includes('XXXX')) return;

  navigator.clipboard.writeText(key)
    .then(() => {
      showToast('Chave de acesso copiada com sucesso!', 'success');
      copyKeyBtn.textContent = 'COPIADA!';
      copyKeyBtn.style.background = '#10b981';
      copyKeyBtn.style.borderColor = '#10b981';
      
      setTimeout(() => {
        copyKeyBtn.textContent = 'COPIAR CHAVE';
        copyKeyBtn.style.background = 'rgba(220, 38, 38, 0.1)';
        copyKeyBtn.style.borderColor = 'rgba(220, 38, 38, 0.3)';
      }, 2000);
    })
    .catch((err) => {
      console.error('Erro ao copiar:', err);
      showToast('Falha ao copiar automaticamente. Selecione e copie manualmente.', 'error');
    });
});

// Acao de Logout
btnLogout.addEventListener('click', () => {
  localStorage.removeItem('almaz_user');
  showSection('login');
  showToast('Você saiu da conta.', 'success');
});

// Auxiliares de Navegacao de Seccoes
function showSection(sectionName) {
  loginSection.classList.remove('active');
  registerSection.classList.remove('active');
  dashboardSection.classList.remove('active');

  if (sectionName === 'login') {
    loginSection.classList.add('active');
  } else if (sectionName === 'register') {
    registerSection.classList.add('active');
  } else if (sectionName === 'dashboard') {
    dashboardSection.classList.add('active');
  }
}

function showDashboard(user) {
  userDisplayName.textContent = user.username;
  clientKeyDisplay.textContent = user.assignedKey;
  showSection('dashboard');
}

// Toast Notifications
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const icon = type === 'success' ? '✓' : '✗';
  toast.innerHTML = `<span>${icon}</span> <div>${message}</div>`;
  
  toastContainer.appendChild(toast);
  
  // Remover automaticamente apos 4 segundos
  setTimeout(() => {
    toast.style.animation = 'slideInLeft 0.3s reverse forwards';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Efeito Visual de Erro
function triggerShake() {
  authCard.classList.add('shake');
  setTimeout(() => {
    authCard.classList.remove('shake');
  }, 400);
}
