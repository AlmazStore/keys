const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'data', 'keys.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Garantir que o diretório data exista
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

// Ler as keys do arquivo JSON
function readKeys() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const keys = JSON.parse(data || '[]');
    return autoExpireKeys(keys);
  } catch (error) {
    console.error('Erro ao ler banco de dados:', error);
    return [];
  }
}

// Salvar as keys no arquivo JSON
function writeKeys(keys) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(keys, null, 2), 'utf8');
  } catch (error) {
    console.error('Erro ao salvar no banco de dados:', error);
  }
}

// Auto expirar keys que passaram da validade
function autoExpireKeys(keys) {
  let updated = false;
  const now = new Date();

  keys.forEach(k => {
    if (k.status === 'active' && k.expiresAt) {
      const expirationDate = new Date(k.expiresAt);
      if (now > expirationDate) {
        k.status = 'expired';
        updated = true;
      }
    }
  });

  if (updated) {
    writeKeys(keys);
  }
  return keys;
}

// Gerar uma key única no formato ALMAZ-XXXX-XXXX
function generateKeyCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const genPart = (length) => {
    let result = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      result += chars[bytes[i] % chars.length];
    }
    return result;
  };
  return `ALMAZ-${genPart(4)}-${genPart(4)}`;
}

// Endpoints da API

// Listar todas as keys
app.get('/api/keys', (req, res) => {
  const keys = readKeys();
  res.json(keys);
});

// Estatísticas das keys
app.get('/api/stats', (req, res) => {
  const keys = readKeys();
  const stats = {
    total: keys.length,
    active: keys.filter(k => k.status === 'active').length,
    expired: keys.filter(k => k.status === 'expired').length,
    revoked: keys.filter(k => k.status === 'revoked').length
  };
  res.json(stats);
});

// Criar nova(s) key(s)
app.post('/api/keys', (req, res) => {
  const { days, clientName, notes, quantity } = req.body;
  const qty = parseInt(quantity) || 1;
  const daysNum = parseInt(days);
  
  const keys = readKeys();
  const createdKeys = [];

  for (let i = 0; i < qty; i++) {
    let keyCode;
    // Garantir que a key seja exclusiva
    do {
      keyCode = generateKeyCode();
    } while (keys.some(k => k.key === keyCode));

    const now = new Date();
    let expiresAt = null;

    if (daysNum > 0) {
      const expiry = new Date();
      expiry.setDate(now.getDate() + daysNum);
      expiresAt = expiry.toISOString();
    }

    const newKey = {
      key: keyCode,
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expiresAt,
      daysTotal: daysNum > 0 ? daysNum : 'lifetime',
      hwid: null,
      clientName: clientName || 'Cliente Anônimo',
      notes: notes || '',
      usedAt: null
    };

    keys.push(newKey);
    createdKeys.push(newKey);
  }

  writeKeys(keys);
  res.status(201).json(createdKeys);
});

// Revogar key
app.put('/api/keys/:key/revoke', (req, res) => {
  const { key } = req.params;
  const keys = readKeys();
  const keyIdx = keys.findIndex(k => k.key === key);

  if (keyIdx === -1) {
    return res.status(404).json({ message: 'Key não encontrada.' });
  }

  keys[keyIdx].status = 'revoked';
  writeKeys(keys);
  res.json(keys[keyIdx]);
});

// Renovar key (adicionar dias)
app.put('/api/keys/:key/renew', (req, res) => {
  const { key } = req.params;
  const { days } = req.body;
  const daysNum = parseInt(days);

  if (isNaN(daysNum) || daysNum <= 0) {
    return res.status(400).json({ message: 'Quantidade de dias inválida.' });
  }

  const keys = readKeys();
  const keyIdx = keys.findIndex(k => k.key === key);

  if (keyIdx === -1) {
    return res.status(404).json({ message: 'Key não encontrada.' });
  }

  const now = new Date();
  let currentExpiry = keys[keyIdx].expiresAt ? new Date(keys[keyIdx].expiresAt) : null;

  // Se já expirou ou não tinha expiração anterior, renovamos a partir de hoje
  if (!currentExpiry || currentExpiry < now) {
    currentExpiry = new Date();
  }

  currentExpiry.setDate(currentExpiry.getDate() + daysNum);
  
  keys[keyIdx].expiresAt = currentExpiry.toISOString();
  keys[keyIdx].status = 'active'; // Volta a ficar ativa
  if (typeof keys[keyIdx].daysTotal === 'number') {
    keys[keyIdx].daysTotal += daysNum;
  } else {
    keys[keyIdx].daysTotal = daysNum;
  }

  writeKeys(keys);
  res.json(keys[keyIdx]);
});

// Resetar HWID de uma key
app.put('/api/keys/:key/reset-hwid', (req, res) => {
  const { key } = req.params;
  const keys = readKeys();
  const keyIdx = keys.findIndex(k => k.key === key);

  if (keyIdx === -1) {
    return res.status(404).json({ message: 'Key não encontrada.' });
  }

  keys[keyIdx].hwid = null;
  writeKeys(keys);
  res.json(keys[keyIdx]);
});

// Excluir key permanentemente
app.delete('/api/keys/:key', (req, res) => {
  const { key } = req.params;
  let keys = readKeys();
  const initialLen = keys.length;
  keys = keys.filter(k => k.key !== key);

  if (keys.length === initialLen) {
    return res.status(404).json({ message: 'Key não encontrada.' });
  }

  writeKeys(keys);
  res.json({ message: 'Key excluída com sucesso.' });
});

// Validar Key (usado pelo loader)
app.post('/api/validate', (req, res) => {
  const { key, hwid } = req.body;

  if (!key) {
    return res.status(400).json({ valid: false, message: 'Código da key é obrigatório.' });
  }
  if (!hwid) {
    return res.status(400).json({ valid: false, message: 'Identificador de hardware (HWID) é obrigatório.' });
  }

  const keys = readKeys();
  const keyObj = keys.find(k => k.key.toUpperCase() === key.toUpperCase());

  if (!keyObj) {
    return res.status(404).json({ valid: false, message: 'Key inválida ou inexistente.' });
  }

  if (keyObj.status === 'revoked') {
    return res.status(403).json({ valid: false, message: 'Esta key foi revogada por um administrador.' });
  }

  // Verifica expiração
  if (keyObj.expiresAt) {
    const expiresDate = new Date(keyObj.expiresAt);
    if (new Date() > expiresDate) {
      keyObj.status = 'expired';
      writeKeys(keys);
      return res.status(403).json({ valid: false, message: 'Esta key expirou.' });
    }
  }

  // Vincula HWID se a key ainda não tiver
  if (!keyObj.hwid) {
    keyObj.hwid = hwid;
    keyObj.usedAt = new Date().toISOString();
    writeKeys(keys);
  } else if (keyObj.hwid !== hwid) {
    return res.status(403).json({ 
      valid: false, 
      message: 'Esta key já está sendo usada em outro computador (HWID não coincide).' 
    });
  }

  // Calcula tempo restante
  let daysRemaining = 'Ilimitado';
  if (keyObj.expiresAt) {
    const diffTime = new Date(keyObj.expiresAt) - new Date();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  res.json({
    valid: true,
    message: 'Autenticação bem-sucedida!',
    expiresAt: keyObj.expiresAt || 'Lifetime',
    daysRemaining: daysRemaining,
    clientName: keyObj.clientName
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
