import { readFile, fileExists } from '../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    if (!fileExists('active_bot.json')) {
      return res.status(200).json({
        connected: false,
        message: 'Nenhum bot conectado',
      });
    }

    const botDataContent = readFile('active_bot.json');
    if (!botDataContent) {
      return res.status(200).json({
        connected: false,
        message: 'Nenhum bot conectado',
      });
    }

    const botData = JSON.parse(botDataContent);

    res.status(200).json({
      connected: true,
      botInfo: {
        id: botData.botInfo.id,
        username: botData.botInfo.username,
        first_name: botData.botInfo.first_name,
      },
      connectedAt: botData.connectedAt,
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ 
      error: 'Erro ao verificar status do bot',
      details: error.message 
    });
  }
}
