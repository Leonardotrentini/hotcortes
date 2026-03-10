import { readFile, fileExists, writeFile, ensureDir } from '../../../lib/telegramStorage';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { channelId, message, date, time, mediaUrl } = req.body;

    if (!channelId || !message || !date || !time) {
      return res.status(400).json({ error: 'channelId, message, date e time são obrigatórios' });
    }

    // Verificar se bot está conectado
    if (!fileExists('active_bot.json')) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    // Criar data/hora agendada
    const scheduledDateTime = new Date(`${date}T${time}`);
    const now = new Date();

    if (scheduledDateTime <= now) {
      return res.status(400).json({ error: 'Data/hora deve ser no futuro' });
    }

    // Salvar postagem agendada
    ensureDir('scheduled');

    const postId = uuidv4();
    const scheduledPost = {
      id: postId,
      channelId: channelId,
      message: message,
      mediaUrl: mediaUrl || null,
      scheduledFor: scheduledDateTime.toISOString(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    writeFile(`scheduled/${postId}.json`, scheduledPost);

    res.status(200).json({
      success: true,
      postId: postId,
      scheduledFor: scheduledDateTime.toISOString(),
      message: 'Postagem agendada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao agendar postagem:', error);
    res.status(500).json({ 
      error: 'Erro ao agendar postagem',
      details: error.message 
    });
  }
}
