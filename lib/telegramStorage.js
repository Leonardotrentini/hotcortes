import fs from 'fs';
import path from 'path';
import os from 'os';

// Armazenamento em memória como fallback
const memoryStorage = {
  activeBot: null,
  knownChannels: [],
  scheduledPosts: {},
  messageStats: {},
};

// Determinar o diretório de armazenamento
function getStorageDir() {
  // No Vercel, usar /tmp que é o único diretório gravável
  // Em outros ambientes serverless, também usar /tmp
  // Em desenvolvimento local, usar o diretório do projeto
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.RAILWAY_ENVIRONMENT) {
    return '/tmp/telegram_bots';
  }
  return path.join(process.cwd(), 'telegram_bots');
}

// Verificar se podemos escrever no diretório
function canWrite(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const testFile = path.join(dir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    return true;
  } catch (error) {
    return false;
  }
}

// Função helper para ler arquivo
export function readFile(filePath, useMemory = false) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, filePath);
  
  // Se usar memória ou não conseguir ler do disco
  if (useMemory || !canWrite(storageDir)) {
    const memoryKey = filePath.replace(/\.json$/, '').replace(/\//g, '_');
    
    if (filePath === 'active_bot.json') {
      return memoryStorage.activeBot ? JSON.stringify(memoryStorage.activeBot) : null;
    }
    if (filePath === 'known_channels.json') {
      return memoryStorage.knownChannels.length > 0 ? JSON.stringify(memoryStorage.knownChannels) : null;
    }
    if (filePath.startsWith('scheduled/')) {
      const postId = path.basename(filePath, '.json');
      return memoryStorage.scheduledPosts[postId] ? JSON.stringify(memoryStorage.scheduledPosts[postId]) : null;
    }
    if (filePath === 'message_stats.json') {
      return Object.keys(memoryStorage.messageStats).length > 0 ? JSON.stringify(memoryStorage.messageStats) : null;
    }
    return null;
  }
  
  // Tentar ler do disco
  try {
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf8');
    }
  } catch (error) {
    console.warn(`Erro ao ler arquivo ${fullPath}, usando memória:`, error.message);
  }
  
  return null;
}

// Função helper para escrever arquivo
export function writeFile(filePath, content) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, filePath);
  
  // Se não conseguir escrever no disco, usar memória
  if (!canWrite(storageDir)) {
    const memoryKey = filePath.replace(/\.json$/, '').replace(/\//g, '_');
    const data = typeof content === 'string' ? JSON.parse(content) : content;
    
    if (filePath === 'active_bot.json') {
      memoryStorage.activeBot = data;
      console.log('Armazenando bot em memória (sistema de arquivos não disponível)');
      return true;
    }
    if (filePath === 'known_channels.json') {
      memoryStorage.knownChannels = data;
      return true;
    }
    if (filePath.startsWith('scheduled/')) {
      const postId = path.basename(filePath, '.json');
      memoryStorage.scheduledPosts[postId] = data;
      return true;
    }
    if (filePath === 'message_stats.json') {
      memoryStorage.messageStats = data;
      return true;
    }
    return false;
  }
  
  // Tentar escrever no disco
  try {
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    fs.writeFileSync(fullPath, contentStr, 'utf8');
    return true;
  } catch (error) {
    console.warn(`Erro ao escrever arquivo ${fullPath}, usando memória:`, error.message);
    // Fallback para memória
    return writeFile(filePath, content); // Recursivo com useMemory implícito
  }
}

// Função helper para verificar se arquivo existe
export function fileExists(filePath) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, filePath);
  
  // Verificar memória primeiro
  const memoryContent = readFile(filePath, true);
  if (memoryContent !== null) {
    return true;
  }
  
  // Verificar disco
  try {
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
}

// Função helper para listar arquivos em diretório
export function listFiles(dirPath) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, dirPath);
  
  // Se usar memória
  if (!canWrite(storageDir)) {
    if (dirPath === 'scheduled') {
      return Object.keys(memoryStorage.scheduledPosts).map(id => `${id}.json`);
    }
    return [];
  }
  
  // Listar do disco
  try {
    if (fs.existsSync(fullPath)) {
      return fs.readdirSync(fullPath);
    }
  } catch (error) {
    console.warn(`Erro ao listar diretório ${fullPath}:`, error.message);
  }
  
  return [];
}

// Função helper para deletar arquivo
export function deleteFile(filePath) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, filePath);
  
  // Remover da memória
  if (filePath === 'active_bot.json') {
    memoryStorage.activeBot = null;
  } else if (filePath === 'known_channels.json') {
    memoryStorage.knownChannels = [];
  } else if (filePath.startsWith('scheduled/')) {
    const postId = path.basename(filePath, '.json');
    delete memoryStorage.scheduledPosts[postId];
  } else if (filePath === 'message_stats.json') {
    memoryStorage.messageStats = {};
  }
  
  // Tentar remover do disco
  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.warn(`Erro ao deletar arquivo ${fullPath}:`, error.message);
  }
}

// Função helper para obter caminho completo
export function getFilePath(filePath) {
  const storageDir = getStorageDir();
  return path.join(storageDir, filePath);
}

// Função helper para garantir que diretório existe
export function ensureDir(dirPath) {
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, dirPath);
  
  if (canWrite(storageDir)) {
    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
      return true;
    } catch (error) {
      console.warn(`Erro ao criar diretório ${fullPath}:`, error.message);
      return false;
    }
  }
  
  return true; // Em memória, não precisa criar diretório
}
