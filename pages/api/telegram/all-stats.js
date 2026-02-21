import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const statsPath = path.join(process.cwd(), 'telegram_bots', 'message_stats.json');
    
    if (!fs.existsSync(statsPath)) {
      return res.status(200).json({ stats: {} });
    }

    const messageStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    res.status(200).json({
      success: true,
      stats: messageStats,
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar estatísticas',
      details: error.message 
    });
  }
}
