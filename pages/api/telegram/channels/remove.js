import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { channelId } = req.query;

    if (!channelId) {
      return res.status(400).json({ error: 'ID do canal é obrigatório' });
    }

    const knownChannelsPath = path.join(process.cwd(), 'telegram_bots', 'known_channels.json');
    
    if (!fs.existsSync(knownChannelsPath)) {
      return res.status(404).json({ error: 'Nenhum canal encontrado' });
    }

    let knownChannels = JSON.parse(fs.readFileSync(knownChannelsPath, 'utf8'));

    // Remover canal
    const initialLength = knownChannels.length;
    knownChannels = knownChannels.filter(
      ch => ch.id !== channelId && ch.id !== parseInt(channelId) && ch.id !== String(channelId)
    );

    if (knownChannels.length === initialLength) {
      return res.status(404).json({ error: 'Canal não encontrado' });
    }

    fs.writeFileSync(
      knownChannelsPath,
      JSON.stringify(knownChannels, null, 2)
    );

    res.status(200).json({
      success: true,
      message: 'Canal removido com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao remover canal:', error);
    res.status(500).json({ 
      error: 'Erro ao remover canal',
      details: error.message 
    });
  }
}
