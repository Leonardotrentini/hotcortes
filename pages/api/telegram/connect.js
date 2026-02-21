import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';

// Armazenar instâncias de bots ativos (em produção, usar banco de dados)
let activeBots = {};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { token } = req.body;

    if (!token || token.length < 20) {
      return res.status(400).json({ error: 'Token inválido. Por favor, forneça um token válido do BotFather.' });
    }

    // Verificar se o token é válido tentando obter informações do bot
    const bot = new TelegramBot(token, { polling: false });
    
    try {
      const botInfo = await bot.getMe();
      
      // Salvar token de forma segura (em produção, usar variáveis de ambiente ou banco de dados)
      const botDataDir = path.join(process.cwd(), 'telegram_bots');
      if (!fs.existsSync(botDataDir)) {
        fs.mkdirSync(botDataDir, { recursive: true });
      }

      const botData = {
        token: token,
        botInfo: {
          id: botInfo.id,
          username: botInfo.username,
          first_name: botInfo.first_name,
        },
        connectedAt: new Date().toISOString(),
      };

      fs.writeFileSync(
        path.join(botDataDir, 'active_bot.json'),
        JSON.stringify(botData, null, 2)
      );

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
      return res.status(400).json({ 
        error: 'Token inválido ou bot não encontrado. Verifique o token e tente novamente.',
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
