import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { messageId, channelId } = req.query;

    if (!messageId || !channelId) {
      return res.status(400).json({ error: 'messageId e channelId são obrigatórios' });
    }

    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    
    if (!fs.existsSync(botDataPath)) {
      return res.status(400).json({ error: 'Nenhum bot conectado' });
    }

    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bot = new TelegramBot(botData.token, { polling: false });

    const chatId = typeof channelId === 'string' && channelId.startsWith('@')
      ? channelId
      : parseInt(channelId);

    try {
      // Tentar obter informações da mensagem
      // Nota: A API do Telegram não retorna reações diretamente via Bot API
      // Mas podemos obter informações básicas da mensagem
      const message = await bot.forwardMessage(chatId, chatId, parseInt(messageId));
      
      // Buscar estatísticas do canal (se disponível)
      let channelStats = null;
      try {
        const chat = await bot.getChat(chatId);
        channelStats = {
          membersCount: chat.members_count || null,
          description: chat.description || null,
        };
      } catch (e) {
        console.warn('Não foi possível obter estatísticas do canal:', e.message);
      }

      // Por enquanto, retornamos informações básicas
      // Em uma implementação futura, poderíamos usar a API do Telegram Client
      // ou webhooks para capturar reações em tempo real
      res.status(200).json({
        success: true,
        messageId: parseInt(messageId),
        channelId: channelId,
        stats: {
          views: null, // Não disponível via Bot API
          reactions: null, // Não disponível via Bot API
          forwards: null, // Não disponível via Bot API
          channelStats: channelStats,
        },
        note: 'Estatísticas detalhadas requerem acesso à API do Telegram Client ou webhooks',
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      
      // Se não conseguir buscar a mensagem, retornar dados básicos
      res.status(200).json({
        success: true,
        messageId: parseInt(messageId),
        channelId: channelId,
        stats: {
          views: null,
          reactions: null,
          forwards: null,
          error: 'Não foi possível buscar estatísticas desta mensagem',
        },
      });
    }
  } catch (error) {
    console.error('Erro no endpoint de estatísticas:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar estatísticas',
      details: error.message 
    });
  }
}
