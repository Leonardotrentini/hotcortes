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
    // Usar /tmp para armazenamento temporário na Vercel
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const uploadsDir = path.join(tmpDir, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const form = formidable({
      uploadDir: uploadsDir,
      keepExtensions: true,
      maxFileSize: 500 * 1024 * 1024, // 500MB
    });

    const [fields, files] = await form.parse(req);
    
    const videoFile = Array.isArray(files.video) ? files.video[0] : files.video;
    
    if (!videoFile) {
      return res.status(400).json({ error: 'Nenhum arquivo de vídeo enviado' });
    }

    // Validar tipo de arquivo
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];
    if (!allowedTypes.includes(videoFile.mimetype)) {
      if (fs.existsSync(videoFile.filepath)) {
        fs.unlinkSync(videoFile.filepath);
      }
      return res.status(400).json({ error: 'Tipo de arquivo não suportado' });
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
    res.status(500).json({ error: error.message || 'Erro ao processar upload' });
  }
}
