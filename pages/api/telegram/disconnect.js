import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    
    if (fs.existsSync(botDataPath)) {
      fs.unlinkSync(botDataPath);
    }

    res.status(200).json({
      success: true,
      message: 'Bot desconectado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao desconectar bot:', error);
    res.status(500).json({ 
      error: 'Erro ao desconectar bot',
      details: error.message 
    });
  }
}
