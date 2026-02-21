import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { channelId, message, mediaUrl } = req.body;

    if (!channelId || !message) {
      return res.status(400).json({ error: 'channelId e message são obrigatórios' });
    }

    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    
    if (!fs.existsSync(botDataPath)) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bot = new TelegramBot(botData.token, { polling: false });

    // Converter channelId para número se for string
    const chatId = typeof channelId === 'string' && channelId.startsWith('@') 
      ? channelId 
      : parseInt(channelId);

    try {
      let sentMessage;

      if (mediaUrl) {
        // Verificar se é URL relativa (arquivo local)
        let finalMediaUrl = mediaUrl;
        
        if (mediaUrl.startsWith('/api/telegram/media/')) {
          // Construir URL completa para arquivo local
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                         (req.headers.host ? `http://${req.headers.host}` : 'http://localhost:3000');
          finalMediaUrl = `${baseUrl}${mediaUrl}`;
        }
        
        // Enviar com mídia
        // Detectar tipo de mídia pela URL
        if (mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) || mediaUrl.includes('/api/telegram/media/')) {
          // Se for arquivo local, ler e enviar como stream
          if (mediaUrl.startsWith('/api/telegram/media/')) {
            const filename = mediaUrl.split('/').pop();
            const mediaPath = path.join(process.cwd(), 'telegram_bots', 'media', filename);
            if (fs.existsSync(mediaPath)) {
              const ext = path.extname(filename).toLowerCase();
              if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                sentMessage = await bot.sendPhoto(chatId, fs.createReadStream(mediaPath), { caption: message });
              } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
                sentMessage = await bot.sendVideo(chatId, fs.createReadStream(mediaPath), { caption: message });
              } else {
                sentMessage = await bot.sendDocument(chatId, fs.createReadStream(mediaPath), { caption: message });
              }
            } else {
              throw new Error('Arquivo de mídia não encontrado');
            }
          } else {
            sentMessage = await bot.sendPhoto(chatId, finalMediaUrl, { caption: message });
          }
        } else if (mediaUrl.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
          sentMessage = await bot.sendVideo(chatId, finalMediaUrl, { caption: message });
        } else {
          // Tentar enviar como documento
          sentMessage = await bot.sendDocument(chatId, finalMediaUrl, { caption: message });
        }
      } else {
        // Enviar apenas texto
        sentMessage = await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
      }

      // Salvar estatísticas iniciais da mensagem
      const statsPath = path.join(process.cwd(), 'telegram_bots', 'message_stats.json');
      let messageStats = {};
      
      if (fs.existsSync(statsPath)) {
        try {
          messageStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
        } catch (e) {
          messageStats = {};
        }
      }

      const messageKey = `${channelId}_${sentMessage.message_id}`;
      messageStats[messageKey] = {
        messageId: sentMessage.message_id,
        channelId: channelId,
        sentAt: new Date().toISOString(),
        views: null,
        reactions: {},
        forwards: 0,
        lastUpdated: new Date().toISOString(),
      };

      fs.writeFileSync(statsPath, JSON.stringify(messageStats, null, 2));

      res.status(200).json({
        success: true,
        messageId: sentMessage.message_id,
        message: 'Mensagem enviada com sucesso!',
      });
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      let errorMessage = 'Erro ao enviar mensagem';
      if (error.response) {
        if (error.response.statusCode === 403) {
          errorMessage = 'Bot não tem permissão para enviar mensagens neste canal. Certifique-se de que o bot é administrador do canal.';
        } else if (error.response.statusCode === 400) {
          errorMessage = 'Canal não encontrado ou bot não é membro. Verifique o ID do canal.';
        } else {
          errorMessage = `Erro do Telegram: ${error.response.body?.description || error.message}`;
        }
      }

      return res.status(400).json({ 
        error: errorMessage,
        details: error.message 
      });
    }
  } catch (error) {
    console.error('Erro no endpoint de envio:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar mensagem',
      details: error.message 
    });
  }
}
