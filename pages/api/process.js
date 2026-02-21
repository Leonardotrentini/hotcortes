import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import archiver from 'archiver';

// Configurar FFmpeg com logs de diagnóstico
let ffmpegPath = null;
if (ffmpegStatic) {
  ffmpegPath = ffmpegStatic;
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log('FFmpeg configurado:', ffmpegStatic);
  console.log('FFmpeg existe:', fs.existsSync(ffmpegStatic));
} else {
  console.error('FFmpeg-static não encontrado!');
}

// Verificar se FFmpeg está acessível
const checkFFmpeg = () => {
  if (!ffmpegPath) {
    throw new Error('FFmpeg não está configurado. ffmpeg-static não foi encontrado.');
  }
  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg não encontrado no caminho: ${ffmpegPath}`);
  }
  // Tentar verificar permissões (pode falhar em alguns ambientes, mas não é crítico)
  try {
    fs.accessSync(ffmpegPath, fs.constants.F_OK);
  } catch (e) {
    console.warn('Aviso: Não foi possível verificar permissões do FFmpeg:', e.message);
  }
};

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
    // Usar preset ultrafast e reduzir qualidade para economizar memória
    // Threads limitado para não sobrecarregar
    ffmpeg(videoPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .addOptions([
        '-preset ultrafast', // Mais rápido, menos memória
        '-crf 28', // Qualidade um pouco menor para economizar
        '-movflags +faststart',
        '-threads 1', // Limitar threads para economizar memória
        '-tune fastdecode' // Otimizar para decodificação rápida
      ])
      .on('start', (commandLine) => {
        console.log('FFmpeg command:', commandLine);
      })
      .on('progress', (progress) => {
        // Log de progresso pode ser útil para debug
        if (progress.percent) {
          console.log(`Progresso: ${Math.round(progress.percent)}%`);
        }
      })
      .on('end', () => {
        console.log('Corte finalizado:', outputPath);
        resolve();
      })
      .on('error', (err) => {
        console.error('Erro FFmpeg:', err);
        reject(err);
      })
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

  // Logs de diagnóstico
  console.log('=== Iniciando processamento ===');
  console.log('RAILWAY env:', process.env.RAILWAY_ENVIRONMENT);
  console.log('FFmpeg path:', ffmpegPath);
  console.log('FFmpeg exists:', ffmpegPath ? fs.existsSync(ffmpegPath) : 'N/A');

  try {
    // Verificar FFmpeg antes de processar
    checkFFmpeg();

    const { jobId, duration } = req.body;

    if (!jobId || !duration) {
      return res.status(400).json({ error: 'jobId e duration são obrigatórios' });
    }

    // Railway usa diretório normal (não é serverless)
    const tmpDir = path.join(process.cwd(), 'uploads');
    const outputDir = path.join(tmpDir, 'outputs', jobId);
    const metadataPath = path.join(outputDir, 'metadata.json');

    console.log('TmpDir:', tmpDir);
    console.log('OutputDir:', outputDir);
    console.log('MetadataPath:', metadataPath);

    if (!fs.existsSync(metadataPath)) {
      console.error('Metadata não encontrado:', metadataPath);
      return res.status(404).json({ error: 'Job não encontrado' });
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const videoPath = metadata.videoPath;

    console.log('VideoPath:', videoPath);
    console.log('Video exists:', fs.existsSync(videoPath));

    if (!fs.existsSync(videoPath)) {
      console.error('Vídeo não encontrado:', videoPath);
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    // Verificar tamanho do vídeo
    const videoStats = fs.statSync(videoPath);
    console.log('Tamanho do vídeo:', videoStats.size, 'bytes');

    const durationSeconds = parseDurationToSeconds(duration);
    console.log('Duração desejada:', durationSeconds, 'segundos');

    let videoDuration;
    try {
      videoDuration = await getVideoDuration(videoPath);
      console.log('Duração do vídeo:', videoDuration, 'segundos');
    } catch (error) {
      console.error('Erro ao obter duração do vídeo:', error);
      return res.status(500).json({ 
        error: 'Erro ao analisar vídeo. Verifique se o arquivo é um vídeo válido.',
        details: error.message 
      });
    }

    const numberOfClips = Math.ceil(videoDuration / durationSeconds);
    console.log('Número de cortes a criar:', numberOfClips);

    // Processar cortes sequencialmente para economizar memória (plano gratuito Render tem 512MB)
    // Processar em lotes pequenos para evitar exceder limite de memória
    const batchSize = 2; // Processar 2 cortes por vez (reduz uso de memória)
    
    console.log('Iniciando criação de cortes em lotes (economia de memória)...');
    
    for (let batchStart = 0; batchStart < numberOfClips; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, numberOfClips);
      const batchPromises = [];
      
      console.log(`Processando lote ${Math.floor(batchStart / batchSize) + 1}: cortes ${batchStart + 1} a ${batchEnd}`);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const startTime = i * durationSeconds;
        const clipDuration = Math.min(durationSeconds, videoDuration - startTime);
        const clipPath = path.join(outputDir, `corte_${String(i + 1).padStart(3, '0')}.mp4`);
        
        batchPromises.push(
          createClip(videoPath, clipPath, startTime, clipDuration)
            .then(() => {
              console.log(`✅ Corte ${i + 1}/${numberOfClips} criado`);
            })
            .catch(err => {
              console.error(`❌ Erro ao criar corte ${i + 1}:`, err);
              throw new Error(`Erro ao criar corte ${i + 1}/${numberOfClips}: ${err.message}`);
            })
        );
      }
      
      // Aguardar lote atual terminar antes de processar próximo
      await Promise.all(batchPromises);
      console.log(`✅ Lote ${Math.floor(batchStart / batchSize) + 1} concluído`);
      
      // Pequena pausa entre lotes para liberar memória
      if (batchEnd < numberOfClips) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de pausa
      }
    }
    
    console.log('✅ Todos os cortes criados com sucesso!');

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
    console.error('=== ERRO NO PROCESSAMENTO ===');
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('Nome:', error.name);
    
    // Verificar se é erro de FFmpeg
    if (error.message && error.message.includes('FFmpeg')) {
      return res.status(500).json({ 
        error: 'Erro ao processar vídeo: FFmpeg não está disponível ou configurado corretamente.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: error.message || 'Erro ao processar vídeo',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
