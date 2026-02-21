import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    
    if (!fs.existsSync(botDataPath)) {
      return res.status(200).json({
        connected: false,
        message: 'Nenhum bot conectado',
      });
    }

    const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));

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
