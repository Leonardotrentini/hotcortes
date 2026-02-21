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

  // Verificar Content-Length antes de processar (limite Vercel: 50MB)
  const contentLength = req.headers['content-length'];
  if (contentLength) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const fileSize = parseInt(contentLength, 10);
    if (fileSize > maxSize) {
      return res.status(413).json({ 
        error: 'Arquivo muito grande. Tamanho máximo: 50MB. Tamanho do arquivo: ' + Math.round(fileSize / 1024 / 1024) + 'MB. Por favor, comprima o vídeo antes de enviar.'
      });
    }
  }

  try {
    // Usar /tmp para armazenamento temporário na Vercel
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const uploadsDir = path.join(tmpDir, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB (limite Vercel Hobby)
      multiples: false,
      filter: ({ name, originalFilename, mimetype }) => {
        // Filtrar apenas arquivos de vídeo
        return mimetype && mimetype.startsWith('video/');
      }
    });

    // Garantir que req tenha as propriedades necessárias
    if (!req.headers) {
      return res.status(400).json({ error: 'Requisição inválida: headers não encontrados' });
    }

    let fields, files;
    try {
      // Usar form.parse com req diretamente
      [fields, files] = await form.parse(req);
    } catch (parseError) {
      console.error('Erro ao fazer parse do formulário:', parseError);
      const errorMsg = parseError.message || 'Erro desconhecido ao processar arquivo';
      
      // Verificar se é erro de tamanho
      if (errorMsg.includes('maxFileSize') || errorMsg.includes('too large')) {
        return res.status(400).json({ 
          error: 'Arquivo muito grande. Tamanho máximo: 50MB. Tente comprimir o vídeo antes de enviar.'
        });
      }
      
      return res.status(400).json({ 
        error: 'Erro ao processar arquivo. Verifique o tamanho (máx 50MB) e formato do vídeo.',
        details: errorMsg
      });
    }
    
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    
    if (!videoFile) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado. Certifique-se de selecionar um arquivo.' });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    const fileMimetype = videoFile.mimetype || '';
    
    if (!fileMimetype || !allowedTypes.includes(fileMimetype)) {
      if (fs.existsSync(videoFile.filepath)) {
        try {
          fs.unlinkSync(videoFile.filepath);
        } catch (e) {
          console.error('Erro ao remover arquivo:', e);
        }
      }
      return res.status(400).json({ 
        error: `Tipo de arquivo não suportado. Tipo recebido: ${fileMimetype || 'desconhecido'}. Formatos aceitos: MP4, MOV, AVI, MKV, WEBM` 
      });
    }

    // Gerar nome único
    const ext = path.extname(videoFile.originalFilename || 'video.mp4');
    const jobId = uuidv4();
    const newFilename = `${jobId}${ext}`;
    const newPath = path.join(uploadsDir, newFilename);

    // Renomear arquivo
    if (fs.existsSync(videoFile.filepath)) {
      fs.renameSync(videoFile.filepath, newPath);
    } else {
      return res.status(500).json({ error: 'Erro ao salvar arquivo' });
    }

    // Criar diretório de output
    const outputDir = path.join(tmpDir, 'outputs', jobId);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Salvar metadados
    const metadata = {
      jobId,
      originalFilename: videoFile.originalFilename,
      uploadDate: new Date().toISOString(),
      videoPath: newPath,
      tmpDir: tmpDir,
    };

    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    );

    res.status(200).json({
      success: true,
      jobId,
      message: 'Vídeo recebido e processamento iniciado',
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    const errorMessage = error.message || 'Erro ao processar upload';
    console.error('Detalhes do erro:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
