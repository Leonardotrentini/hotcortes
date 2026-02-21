import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    
    if (!fs.existsSync(botDataPath)) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
    const bot = new TelegramBot(botData.token, { polling: false });

    // Obter chats onde o bot está (canais e grupos)
    // Nota: A API do Telegram não permite listar todos os canais diretamente
    // Vamos usar uma abordagem alternativa: armazenar canais conhecidos ou usar getChat
    
    const channels = [];

    // Tentar obter informações de canais conhecidos (se houver)
    const knownChannelsPath = path.join(process.cwd(), 'telegram_bots', 'known_channels.json');
    
    if (fs.existsSync(knownChannelsPath)) {
      const knownChannels = JSON.parse(fs.readFileSync(knownChannelsPath, 'utf8'));
      
      for (const channelInfo of knownChannels) {
        try {
          // Se já temos informações completas, usar diretamente
          if (channelInfo.id && channelInfo.title) {
            channels.push({
              id: channelInfo.id,
              title: channelInfo.title,
              username: channelInfo.username || null,
              type: channelInfo.type || 'channel',
            });
          } else {
            // Tentar obter informações do canal via API
            const chatId = typeof channelInfo === 'string' && channelInfo.startsWith('@')
              ? channelInfo
              : (typeof channelInfo === 'object' ? channelInfo.id : channelInfo);
            
            const chat = await bot.getChat(chatId);
            if (chat.type === 'channel' || chat.type === 'supergroup') {
              channels.push({
                id: chat.id,
                title: chat.title,
                username: chat.username,
                type: chat.type,
              });
            }
          }
        } catch (error) {
          // Canal não acessível ou bot não é membro, mas ainda mostrar na lista
          if (channelInfo.id && channelInfo.title) {
            channels.push({
              id: channelInfo.id,
              title: channelInfo.title,
              username: channelInfo.username || null,
              type: channelInfo.type || 'channel',
              error: 'Não acessível - verifique se o bot é administrador',
            });
          } else {
            console.warn(`Não foi possível acessar canal ${channelInfo}:`, error.message);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      channels: channels,
      message: channels.length > 0 
        ? `${channels.length} canal(is) encontrado(s)` 
        : 'Nenhum canal encontrado. Adicione o bot aos canais e use o formato @nome_do_canal ou forneça o ID do canal.',
    });
  } catch (error) {
    console.error('Erro ao listar canais:', error);
    res.status(500).json({ 
      error: 'Erro ao listar canais',
      details: error.message 
    });
  }
}
