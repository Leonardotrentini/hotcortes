import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { jobId, file } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId é obrigatório' });
    }

    // Usar /tmp na Vercel ou diretório local
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const outputDir = path.join(tmpDir, 'outputs', jobId);

    let filePath;
    let filename;

    if (file) {
      // Download de arquivo individual
      filePath = path.join(outputDir, file);
      filename = file;
    } else {
      // Download de ZIP
      filePath = path.join(outputDir, `cortes_${jobId}.zip`);
      filename = `cortes_${jobId}.zip`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }

    const stat = fs.statSync(filePath);
    
    // Se for vídeo individual, servir para visualização inline
    // Se for ZIP, forçar download
    const isVideo = file && file.endsWith('.mp4');
    
    if (isVideo) {
      // Servir vídeo para visualização no navegador
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Suportar range requests para streaming
      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(filePath, { start, end });
        
        res.status(206);
        res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
        res.setHeader('Content-Length', chunksize);
        fileStream.pipe(res);
      } else {
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
      }
    } else {
      // ZIP: forçar download
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Erro no download:', error);
    res.status(500).json({ error: error.message || 'Erro ao fazer download' });
  }
}
