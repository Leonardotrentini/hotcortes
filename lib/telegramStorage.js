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
    const tmpDir = '/tmp/telegram_bots';
    console.log(`[Storage] Usando diretório: ${tmpDir} (Vercel: ${!!process.env.VERCEL})`);
    return tmpDir;
  }
  const localDir = path.join(process.cwd(), 'telegram_bots');
  console.log(`[Storage] Usando diretório local: ${localDir}`);
  return localDir;
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
  // No Vercel, tentar usar variáveis de ambiente primeiro (persistem entre requisições)
  if (process.env.VERCEL) {
    const envKey = `TELEGRAM_${filePath.replace(/\.json$/, '').replace(/\//g, '_').toUpperCase()}`;
    if (process.env[envKey]) {
      try {
        return process.env[envKey];
      } catch (error) {
        console.warn(`Erro ao ler de variável de ambiente ${envKey}:`, error.message);
      }
    }
  }
  
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
      const content = fs.readFileSync(fullPath, 'utf8');
      console.log(`[Storage] ✅ Arquivo lido com sucesso: ${fullPath} (${content.length} bytes)`);
      return content;
    } else {
      console.log(`[Storage] ⚠️ Arquivo não existe: ${fullPath}`);
    }
  } catch (error) {
    console.error(`[Storage] ❌ Erro ao ler arquivo ${fullPath}:`, error.message);
    console.error(`[Storage] Stack:`, error.stack);
  }
  
  return null;
}

// Função helper para escrever arquivo
export function writeFile(filePath, content) {
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
  
  // No Vercel, tentar usar variáveis de ambiente primeiro (mas limitado a 4KB por variável)
  // Para dados maiores, usar /tmp
  if (process.env.VERCEL && contentStr.length < 4000) {
    const envKey = `TELEGRAM_${filePath.replace(/\.json$/, '').replace(/\//g, '_').toUpperCase()}`;
    try {
      // No Vercel, não podemos modificar variáveis de ambiente em runtime
      // Mas podemos usar /tmp que é compartilhado entre requisições da mesma instância
      // Vamos usar /tmp como principal no Vercel
    } catch (error) {
      console.warn(`Erro ao escrever em variável de ambiente ${envKey}:`, error.message);
    }
  }
  
  const storageDir = getStorageDir();
  const fullPath = path.join(storageDir, filePath);
  
  // Tentar escrever no disco primeiro (no Vercel, /tmp funciona)
  if (canWrite(storageDir)) {
    try {
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, contentStr, 'utf8');
      console.log(`[Storage] ✅ Arquivo salvo com sucesso em: ${fullPath}`);
      console.log(`[Storage] Tamanho: ${contentStr.length} bytes`);
      // Verificar se foi salvo corretamente
      if (fs.existsSync(fullPath)) {
        const savedContent = fs.readFileSync(fullPath, 'utf8');
        if (savedContent === contentStr) {
          console.log(`[Storage] ✅ Verificação: arquivo salvo corretamente`);
        } else {
          console.warn(`[Storage] ⚠️ Verificação: conteúdo não corresponde`);
        }
      }
      return true;
    } catch (error) {
      console.error(`[Storage] ❌ Erro ao escrever arquivo ${fullPath}:`, error.message);
      console.error(`[Storage] Stack:`, error.stack);
    }
  } else {
    console.warn(`[Storage] ⚠️ Não é possível escrever em: ${storageDir}`);
  }
  
  // Se não conseguir escrever no disco, usar memória (não persiste no Vercel)
  const data = typeof content === 'string' ? JSON.parse(content) : content;
  
  if (filePath === 'active_bot.json') {
    memoryStorage.activeBot = data;
    console.warn('⚠️ Armazenando bot em memória (não persiste entre requisições no Vercel)');
    return true;
  }
  if (filePath === 'known_channels.json') {
    memoryStorage.knownChannels = data;
    console.warn('⚠️ Armazenando canais em memória (não persiste entre requisições no Vercel)');
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

// Função helper para verificar se arquivo existe
export function fileExists(filePath) {
  // No Vercel, verificar variáveis de ambiente primeiro
  if (process.env.VERCEL) {
    const envKey = `TELEGRAM_${filePath.replace(/\.json$/, '').replace(/\//g, '_').toUpperCase()}`;
    if (process.env[envKey]) {
      return true;
    }
  }
  
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
