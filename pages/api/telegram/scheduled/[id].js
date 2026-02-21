import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method === 'PUT') {
    try {
      const { id } = req.query;
      const { message, scheduledFor, mediaUrl } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'ID da postagem é obrigatório' });
      }

      const scheduledDir = path.join(process.cwd(), 'telegram_bots', 'scheduled');
      const postPath = path.join(scheduledDir, `${id}.json`);

      if (!fs.existsSync(postPath)) {
        return res.status(404).json({ error: 'Postagem não encontrada' });
      }

      const postData = JSON.parse(fs.readFileSync(postPath, 'utf8'));
      
      // Verificar se a postagem ainda está pendente
      if (postData.status === 'sent') {
        return res.status(400).json({ error: 'Não é possível editar uma postagem já enviada' });
      }
      
      // Atualizar dados
      if (message) postData.message = message;
      if (scheduledFor) {
        const newDate = new Date(scheduledFor);
        const now = new Date();
        if (newDate <= now) {
          return res.status(400).json({ error: 'Data/hora deve ser no futuro' });
        }
        postData.scheduledFor = newDate.toISOString();
      }
      if (mediaUrl !== undefined) postData.mediaUrl = mediaUrl || null;
      postData.updatedAt = new Date().toISOString();

      fs.writeFileSync(postPath, JSON.stringify(postData, null, 2));

      res.status(200).json({
        success: true,
        message: 'Postagem atualizada com sucesso',
        post: postData,
      });
    } catch (error) {
      console.error('Erro ao atualizar postagem:', error);
      res.status(500).json({ 
        error: 'Erro ao atualizar postagem',
        details: error.message 
      });
    }
    return;
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'ID da postagem é obrigatório' });
    }

    const scheduledDir = path.join(process.cwd(), 'telegram_bots', 'scheduled');
    const postPath = path.join(scheduledDir, `${id}.json`);

    if (!fs.existsSync(postPath)) {
      return res.status(404).json({ error: 'Postagem não encontrada' });
    }

    fs.unlinkSync(postPath);

    res.status(200).json({
      success: true,
      message: 'Postagem cancelada com sucesso',
    });
  } catch (error) {
    console.error('Erro ao cancelar postagem:', error);
    res.status(500).json({ 
      error: 'Erro ao cancelar postagem',
      details: error.message 
    });
  }
}
