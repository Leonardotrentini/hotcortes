import { readFile, fileExists, writeFile } from '../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { messageId, channelId, reactions, views, forwards } = req.body;

    if (!messageId || !channelId) {
      return res.status(400).json({ error: 'messageId e channelId são obrigatórios' });
    }

    let messageStats = {};
    
    if (fileExists('message_stats.json')) {
      try {
        const statsContent = readFile('message_stats.json');
        if (statsContent) {
          messageStats = JSON.parse(statsContent);
        }
      } catch (e) {
        messageStats = {};
      }
    }

    const messageKey = `${channelId}_${messageId}`;
    
    if (!messageStats[messageKey]) {
      messageStats[messageKey] = {
        messageId: parseInt(messageId),
        channelId: channelId,
        sentAt: new Date().toISOString(),
        views: null,
        reactions: {},
        forwards: 0,
      };
    }

    // Atualizar estatísticas
    if (reactions !== undefined) {
      messageStats[messageKey].reactions = reactions;
    }
    if (views !== undefined) {
      messageStats[messageKey].views = views;
    }
    if (forwards !== undefined) {
      messageStats[messageKey].forwards = forwards;
    }
    
    messageStats[messageKey].lastUpdated = new Date().toISOString();

    writeFile('message_stats.json', messageStats);

    res.status(200).json({
      success: true,
      stats: messageStats[messageKey],
      message: 'Estatísticas atualizadas com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao atualizar estatísticas:', error);
    res.status(500).json({ 
      error: 'Erro ao atualizar estatísticas',
      details: error.message 
    });
  }
}
