import { deleteFile, fileExists } from '../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    if (fileExists('active_bot.json')) {
      deleteFile('active_bot.json');
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
