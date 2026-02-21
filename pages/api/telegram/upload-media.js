import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Verificar se bot está conectado
    const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
    if (!fs.existsSync(botDataPath)) {
      return res.status(400).json({ error: 'Nenhum bot conectado. Conecte um bot primeiro.' });
    }

    // Criar diretório para mídias
    const mediaDir = path.join(process.cwd(), 'telegram_bots', 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: mediaDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB (limite do Telegram)
      multiples: false,
      filter: ({ name, originalFilename, mimetype }) => {
        // Aceitar apenas imagens e vídeos
        return mimetype && (mimetype.startsWith('image/') || mimetype.startsWith('video/'));
      }
    });

    let fields, files;
    try {
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error('Erro ao fazer parse do formulário:', parseError);
      return res.status(400).json({ 
        error: 'Erro ao processar arquivo. Verifique o tamanho (máx 50MB) e formato.',
        details: parseError.message
      });
    }

    const mediaFile = Array.isArray(files.media) ? files.media[0] : files.media;
    
    if (!mediaFile) {
      return res.status(400).json({ error: 'Nenhum arquivo de mídia enviado' });
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'
    ];
    
    if (!mediaFile.mimetype || !allowedTypes.includes(mediaFile.mimetype)) {
      if (fs.existsSync(mediaFile.filepath)) {
        try {
          fs.unlinkSync(mediaFile.filepath);
        } catch (e) {
          console.error('Erro ao remover arquivo:', e);
        }
      }
      return res.status(400).json({ 
        error: `Tipo de arquivo não suportado. Tipo recebido: ${mediaFile.mimetype || 'desconhecido'}. Formatos aceitos: JPG, PNG, GIF, WEBP, MP4, MOV, AVI, MKV, WEBM` 
      });
    }

    // Gerar nome único
    const ext = path.extname(mediaFile.originalFilename || 'file');
    const fileId = uuidv4();
    const newFilename = `${fileId}${ext}`;
    const newPath = path.join(mediaDir, newFilename);

    // Renomear arquivo
    if (fs.existsSync(mediaFile.filepath)) {
      fs.renameSync(mediaFile.filepath, newPath);
    } else {
      return res.status(500).json({ error: 'Erro ao salvar arquivo' });
    }

    // Retornar URL relativa (em produção, usar URL completa)
    const mediaUrl = `/api/telegram/media/${newFilename}`;

    res.status(200).json({
      success: true,
      mediaUrl: mediaUrl,
      filename: newFilename,
      size: fs.statSync(newPath).size,
      message: 'Arquivo enviado com sucesso',
    });
  } catch (error) {
    console.error('Erro no upload de mídia:', error);
    res.status(500).json({ 
      error: 'Erro ao fazer upload de mídia',
      details: error.message 
    });
  }
}
