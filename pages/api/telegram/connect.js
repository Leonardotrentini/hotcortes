import TelegramBot from 'node-telegram-bot-api';
import { writeFile, fileExists, ensureDir } from '../../../lib/telegramStorage';

// Armazenar instâncias de bots ativos (em produção, usar banco de dados)
let activeBots = {};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { token } = req.body;

    // Remover espaços em branco do token
    const trimmedToken = token ? token.trim() : '';

    if (!trimmedToken || trimmedToken.length < 20) {
      return res.status(400).json({ error: 'Token inválido. Por favor, forneça um token válido do BotFather.' });
    }

    // Validar formato básico do token (deve ter o formato: número:hash)
    if (!/^\d+:[A-Za-z0-9_-]+$/.test(trimmedToken)) {
      return res.status(400).json({ error: 'Formato de token inválido. O token deve ter o formato: número:hash' });
    }

    // Verificar se o token é válido tentando obter informações do bot
    const bot = new TelegramBot(trimmedToken, { polling: false });
    
    try {
      const botInfo = await bot.getMe();
      
      // Salvar token de forma segura (usa /tmp no Vercel ou memória como fallback)
      ensureDir('');

      const botData = {
        token: trimmedToken,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
        },
        connectedAt: new Date().toISOString(),
      };

      writeFile('active_bot.json', botData);

      // Armazenar bot ativo
      activeBots[botInfo.id] = bot;

      // Iniciar agendador se ainda não estiver rodando
      try {
        const { startScheduler } = require('../../../lib/telegramScheduler');
        startScheduler();
      } catch (e) {
        console.warn('Aviso: Não foi possível iniciar agendador:', e.message);
      }

      res.status(200).json({
        success: true,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
        },
        message: 'Bot conectado com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao conectar bot:', error);
      console.error('Token recebido (primeiros 10 caracteres):', trimmedToken.substring(0, 10) + '...');
      
      // Mensagem de erro mais específica
      let errorMessage = 'Token inválido ou bot não encontrado. Verifique o token e tente novamente.';
      if (error.response) {
        errorMessage += ` Detalhes: ${error.response.description || error.message}`;
      } else if (error.message) {
        errorMessage += ` Detalhes: ${error.message}`;
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Erro no endpoint de conexão:', error);
    res.status(500).json({ 
      error: 'Erro ao conectar bot',
      details: error.message 
    });
  }
}
