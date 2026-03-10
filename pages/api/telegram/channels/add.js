import TelegramBot from 'node-telegram-bot-api';
import { readFile, fileExists, writeFile, ensureDir } from '../../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { channelId, channelTitle } = req.body;

    // Validar se channelId existe e não está vazio
    if (!channelId || (typeof channelId === 'string' && channelId.trim() === '')) {
      return res.status(400).json({ error: 'ID do canal é obrigatório' });
    }

    if (!fileExists('active_bot.json')) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    const botDataContent = readFile('active_bot.json');
    if (!botDataContent) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    const botData = JSON.parse(botDataContent);
    const bot = new TelegramBot(botData.token, { polling: false });

    // Tentar validar o canal
    let channelInfo = {
      id: channelId,
      title: channelTitle || `Canal ${channelId}`,
      username: null,
      type: 'channel',
    };

    try {
      // Tentar obter informações do canal
      let chatId;
      if (typeof channelId === 'string' && channelId.startsWith('@')) {
        chatId = channelId;
      } else {
        // Converter para número (manter negativo se houver)
        const numId = channelId.toString().trim();
        chatId = numId.startsWith('-') ? parseInt(numId) : parseInt(numId);
      }
      
      const chat = await bot.getChat(chatId);
      channelInfo = {
        id: chat.id,
        title: chat.title || channelTitle || `Canal ${chat.id}`,
        username: chat.username || null,
        type: chat.type || 'channel',
      };
    } catch (error) {
      // Se não conseguir obter informações, usar os dados fornecidos
      console.warn('Não foi possível validar o canal, usando dados fornecidos:', error.message);
      
      // Garantir que o ID seja numérico se não for username
      if (typeof channelId === 'string' && !channelId.startsWith('@')) {
        const numId = channelId.toString().trim();
        channelInfo.id = numId.startsWith('-') ? parseInt(numId) : parseInt(numId);
      } else if (typeof channelId === 'number') {
        channelInfo.id = channelId;
      } else {
        channelInfo.id = channelId.toString().trim();
      }
    }

    // Salvar canal na lista de canais conhecidos
    let knownChannels = [];

    if (fileExists('known_channels.json')) {
      try {
        const knownChannelsContent = readFile('known_channels.json');
        if (knownChannelsContent) {
          knownChannels = JSON.parse(knownChannelsContent);
        }
      } catch (e) {
        console.warn('Erro ao ler canais conhecidos, criando nova lista');
        knownChannels = [];
      }
    }

    // Verificar se o canal já existe
    const channelExists = knownChannels.some(
      ch => ch.id === channelInfo.id || ch.id === channelId
    );

    if (channelExists) {
      return res.status(400).json({ 
        error: 'Este canal já está adicionado',
        channel: channelInfo 
      });
    }

    // Adicionar canal
    knownChannels.push(channelInfo);

    // Garantir que o diretório existe
    ensureDir('');

    writeFile('known_channels.json', knownChannels);

    res.status(200).json({
      success: true,
      channel: channelInfo,
      message: 'Canal adicionado com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao adicionar canal:', error);
    res.status(500).json({ 
      error: 'Erro ao adicionar canal',
      details: error.message 
    });
  }
}
