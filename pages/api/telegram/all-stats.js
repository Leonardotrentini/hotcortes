import { readFile, fileExists } from '../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    if (!fileExists('message_stats.json')) {
      return res.status(200).json({ stats: {} });
    }

    const statsContent = readFile('message_stats.json');
    if (!statsContent) {
      return res.status(200).json({ stats: {} });
    }

    const messageStats = JSON.parse(statsContent);

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
