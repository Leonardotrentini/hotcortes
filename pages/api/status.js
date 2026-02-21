import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { jobId } = req.query;

    if (!jobId) {
      return res.status(400).json({ error: 'jobId é obrigatório' });
    }

    // Usar /tmp na Vercel ou diretório local
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const outputDir = path.join(tmpDir, 'outputs', jobId);
    const metadataPath = path.join(outputDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const zipPath = path.join(outputDir, `cortes_${jobId}.zip`);

    // Verificar se processamento está completo
    const isComplete = fs.existsSync(zipPath);
    const clips = [];

    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      files.forEach((file) => {
        if (file.endsWith('.mp4') && file.startsWith('corte_')) {
          clips.push({
            name: file,
            url: `/api/download?jobId=${jobId}&file=${file}`,
          });
        }
      });
    }

    const progress = isComplete ? 100 : Math.min(90, Math.floor((clips.length / (metadata.numberOfClips || 1)) * 90));

    res.status(200).json({
      status: isComplete ? 'completed' : 'processing',
      progress,
      clips,
      downloadUrl: isComplete ? `/api/download?jobId=${jobId}` : null,
      metadata: {
        expectedDuration: metadata.expectedDuration,
        numberOfClips: metadata.numberOfClips,
      },
    });
  } catch (error) {
    console.error('Erro ao verificar status:', error);
    res.status(500).json({ error: error.message || 'Erro ao verificar status' });
  }
}
