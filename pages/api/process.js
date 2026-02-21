import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import archiver from 'archiver';

// Configurar FFmpeg
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

function parseDurationToSeconds(duration) {
  const durationMap = {
    '15s': 15,
    '30s': 30,
    '1min': 60,
    '2min': 120,
    '3min': 180,
    '5min': 300,
    '8min': 480,
    '10min': 600,
    '13min': 780,
    '15min': 900,
  };
  return durationMap[duration] || 30;
}

function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(metadata.format.duration);
    });
  });
}

function createClip(videoPath, outputPath, startTime, duration) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOptions(['-preset fast', '-crf 23', '-movflags +faststart'])
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function createZip(files, outputPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);

    files.forEach((file) => {
      if (fs.existsSync(file)) {
        archive.file(file, { name: path.basename(file) });
      }
    });

    archive.finalize();
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { jobId, duration } = req.body;

    if (!jobId || !duration) {
      return res.status(400).json({ error: 'jobId e duration são obrigatórios' });
    }

    // Usar /tmp na Vercel ou diretório local
    const tmpDir = process.env.VERCEL ? '/tmp' : path.join(process.cwd(), 'uploads');
    const outputDir = path.join(tmpDir, 'outputs', jobId);
    const metadataPath = path.join(outputDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const videoPath = metadata.videoPath;

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    const durationSeconds = parseDurationToSeconds(duration);
    const videoDuration = await getVideoDuration(videoPath);
    const numberOfClips = Math.ceil(videoDuration / durationSeconds);

    // Criar cortes em paralelo
    const clipPromises = [];
    for (let i = 0; i < numberOfClips; i++) {
      const startTime = i * durationSeconds;
      const clipDuration = Math.min(durationSeconds, videoDuration - startTime);
      const clipPath = path.join(outputDir, `corte_${String(i + 1).padStart(3, '0')}.mp4`);
      clipPromises.push(createClip(videoPath, clipPath, startTime, clipDuration));
    }

    await Promise.all(clipPromises);

    // Criar ZIP
    const zipPath = path.join(outputDir, `cortes_${jobId}.zip`);
    const clipFiles = Array.from({ length: numberOfClips }, (_, i) =>
      path.join(outputDir, `corte_${String(i + 1).padStart(3, '0')}.mp4`)
    );

    await createZip(clipFiles, zipPath);

    // Atualizar metadados
    metadata.expectedDuration = durationSeconds;
    metadata.numberOfClips = numberOfClips;
    metadata.processedAt = new Date().toISOString();
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Remover vídeo original
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    res.status(200).json({
      success: true,
      jobId,
      numberOfClips,
      downloadUrl: `/api/download?jobId=${jobId}`,
    });
  } catch (error) {
    console.error('Erro no processamento:', error);
    res.status(500).json({ error: error.message || 'Erro ao processar vídeo' });
  }
}
