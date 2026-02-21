import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { filename } = req.query;

    if (!filename) {
      return res.status(400).json({ error: 'Nome do arquivo é obrigatório' });
    }

    // Validar nome do arquivo (prevenir path traversal)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }

    const mediaDir = path.join(process.cwd(), 'telegram_bots', 'media');
    const filePath = path.join(mediaDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    // Determinar tipo de conteúdo
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
      '.webm': 'video/webm',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    // Ler e enviar arquivo
    const fileBuffer = fs.readFileSync(filePath);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileBuffer.length);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache por 1 ano
    
    res.status(200).send(fileBuffer);
  } catch (error) {
    console.error('Erro ao servir arquivo de mídia:', error);
    res.status(500).json({ 
      error: 'Erro ao servir arquivo',
      details: error.message 
    });
  }
}
