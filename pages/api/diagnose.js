import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const diagnosis = {
    timestamp: new Date().toISOString(),
    environment: {
      railway: !!process.env.RAILWAY_ENVIRONMENT,
      nodeEnv: process.env.NODE_ENV,
      nodeVersion: process.version,
      platform: process.platform,
      cwd: process.cwd(),
    },
    ffmpeg: {
      installed: false,
      path: null,
      exists: false,
      executable: false,
      configured: false,
      error: null,
    },
    ffprobe: {
      installed: false,
      path: null,
      exists: false,
      executable: false,
      configured: false,
      working: false,
      error: null,
    },
    directories: {
      uploads: null,
      canWrite: false,
      canRead: false,
      error: null,
    },
    fluentFfmpeg: {
      configured: false,
      canProbe: false,
      testResult: null,
      error: null,
    },
    summary: {
      allChecks: [],
      criticalIssues: [],
      warnings: [],
      status: 'unknown',
    },
  };

  // ===== TESTE 1: FFmpeg Static =====
  console.log('=== TESTE 1: Verificando FFmpeg Static ===');
  try {
    diagnosis.ffmpeg.installed = !!ffmpegStatic;
    diagnosis.ffmpeg.path = ffmpegStatic || 'NÃO ENCONTRADO';
    
    if (ffmpegStatic) {
      diagnosis.ffmpeg.exists = fs.existsSync(ffmpegStatic);
      
      if (diagnosis.ffmpeg.exists) {
        try {
          // Tentar configurar
          ffmpeg.setFfmpegPath(ffmpegStatic);
          diagnosis.ffmpeg.configured = true;
          diagnosis.ffmpeg.executable = true;
          console.log('✅ FFmpeg encontrado e configurado:', ffmpegStatic);
        } catch (e) {
          diagnosis.ffmpeg.error = e.message;
          diagnosis.summary.criticalIssues.push('FFmpeg encontrado mas não pode ser configurado: ' + e.message);
          console.error('❌ Erro ao configurar FFmpeg:', e);
        }
      } else {
        diagnosis.ffmpeg.error = 'Arquivo não existe no caminho especificado';
        diagnosis.summary.criticalIssues.push('FFmpeg não encontrado no caminho: ' + ffmpegStatic);
        console.error('❌ FFmpeg não existe:', ffmpegStatic);
      }
    } else {
      diagnosis.ffmpeg.error = 'ffmpeg-static não retornou caminho';
      diagnosis.summary.criticalIssues.push('ffmpeg-static não está instalado ou não retornou caminho');
      console.error('❌ ffmpeg-static não encontrado');
    }
  } catch (error) {
    diagnosis.ffmpeg.error = error.message;
    diagnosis.summary.criticalIssues.push('Erro ao verificar FFmpeg: ' + error.message);
    console.error('❌ Erro no teste FFmpeg:', error);
  }

  // ===== TESTE 2: FFprobe Static =====
  console.log('=== TESTE 2: Verificando FFprobe Static ===');
  try {
    diagnosis.ffprobe.installed = !!ffprobeStatic;
    
    // ffprobe-static retorna um objeto {path: "..."}, não uma string direta
    let ffprobePath = null;
    if (ffprobeStatic) {
      if (typeof ffprobeStatic === 'string') {
        ffprobePath = ffprobeStatic;
      } else if (ffprobeStatic && ffprobeStatic.path) {
        ffprobePath = ffprobeStatic.path;
      } else {
        ffprobePath = ffprobeStatic;
      }
    }
    
    diagnosis.ffprobe.path = ffprobePath || 'NÃO ENCONTRADO';
    
    if (ffprobePath) {
      diagnosis.ffprobe.exists = fs.existsSync(ffprobePath);
      
      if (diagnosis.ffprobe.exists) {
        try {
          // Tentar configurar
          ffmpeg.setFfprobePath(ffprobePath);
          diagnosis.ffprobe.configured = true;
          diagnosis.ffprobe.executable = true;
          console.log('✅ FFprobe encontrado e configurado:', ffprobePath);
        } catch (e) {
          diagnosis.ffprobe.error = e.message;
          diagnosis.summary.criticalIssues.push('FFprobe encontrado mas não pode ser configurado: ' + e.message);
          console.error('❌ Erro ao configurar FFprobe:', e);
        }
      } else {
        diagnosis.ffprobe.error = 'Arquivo não existe no caminho especificado';
        diagnosis.summary.criticalIssues.push('FFprobe não encontrado no caminho: ' + ffprobePath);
        console.error('❌ FFprobe não existe:', ffprobePath);
        console.error('Tipo de ffprobeStatic:', typeof ffprobeStatic);
        console.error('Valor de ffprobeStatic:', JSON.stringify(ffprobeStatic));
      }
    } else {
      diagnosis.ffprobe.error = 'ffprobe-static não retornou caminho';
      diagnosis.summary.criticalIssues.push('ffprobe-static não está instalado ou não retornou caminho');
      console.error('❌ ffprobe-static não encontrado');
    }
  } catch (error) {
    diagnosis.ffprobe.error = error.message;
    diagnosis.summary.criticalIssues.push('Erro ao verificar FFprobe: ' + error.message);
    console.error('❌ Erro no teste FFprobe:', error);
  }

  // ===== TESTE 3: Diretórios =====
  console.log('=== TESTE 3: Verificando Diretórios ===');
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    diagnosis.directories.uploads = uploadsDir;
    
    // Criar diretório se não existir
    if (!fs.existsSync(uploadsDir)) {
      try {
        fs.mkdirSync(uploadsDir, { recursive: true });
        console.log('✅ Diretório uploads criado:', uploadsDir);
      } catch (e) {
        diagnosis.directories.error = 'Não foi possível criar diretório: ' + e.message;
        diagnosis.summary.criticalIssues.push('Não foi possível criar diretório uploads: ' + e.message);
        console.error('❌ Erro ao criar diretório:', e);
      }
    }
    
    // Testar escrita
    try {
      const testFile = path.join(uploadsDir, 'test-write-' + Date.now() + '.txt');
      fs.writeFileSync(testFile, 'test');
      diagnosis.directories.canWrite = true;
      fs.unlinkSync(testFile);
      console.log('✅ Pode escrever no diretório uploads');
    } catch (e) {
      diagnosis.directories.canWrite = false;
      diagnosis.directories.error = 'Não foi possível escrever: ' + e.message;
      diagnosis.summary.criticalIssues.push('Não foi possível escrever no diretório: ' + e.message);
      console.error('❌ Erro ao escrever:', e);
    }
    
    // Testar leitura
    try {
      const files = fs.readdirSync(uploadsDir);
      diagnosis.directories.canRead = true;
      console.log('✅ Pode ler o diretório uploads');
    } catch (e) {
      diagnosis.directories.canRead = false;
      diagnosis.summary.warnings.push('Não foi possível ler diretório: ' + e.message);
      console.warn('⚠️ Erro ao ler diretório:', e);
    }
  } catch (error) {
    diagnosis.directories.error = error.message;
    diagnosis.summary.criticalIssues.push('Erro ao verificar diretórios: ' + error.message);
    console.error('❌ Erro no teste de diretórios:', error);
  }

  // ===== TESTE 4: Fluent-FFmpeg e FFprobe Funcional =====
  console.log('=== TESTE 4: Testando Fluent-FFmpeg e FFprobe ===');
  try {
    if (diagnosis.ffmpeg.configured && diagnosis.ffprobe.configured) {
      diagnosis.fluentFfmpeg.configured = true;
      
      // Tentar usar ffprobe em um arquivo inexistente (só para testar se está configurado)
      // Isso vai falhar, mas vamos ver o tipo de erro
      const testPath = path.join(process.cwd(), 'uploads', 'test-nonexistent.mp4');
      
      await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(testPath, (err, metadata) => {
          if (err) {
            // Erro esperado (arquivo não existe), mas vamos verificar o tipo de erro
            if (err.message && err.message.includes('No such file')) {
              diagnosis.fluentFfmpeg.canProbe = true;
              diagnosis.fluentFfmpeg.testResult = 'FFprobe está funcionando (erro esperado: arquivo não existe)';
              console.log('✅ FFprobe está funcionando (teste com arquivo inexistente passou)');
            } else if (err.message && (err.message.includes('ffprobe') || err.message.includes('spawn'))) {
              diagnosis.fluentFfmpeg.error = 'FFprobe não está acessível: ' + err.message;
              diagnosis.summary.criticalIssues.push('FFprobe não está funcionando: ' + err.message);
              console.error('❌ FFprobe não está funcionando:', err.message);
            } else {
              diagnosis.fluentFfmpeg.canProbe = true;
              diagnosis.fluentFfmpeg.testResult = 'FFprobe respondeu (erro: ' + err.message + ')';
              console.log('✅ FFprobe está respondendo');
            }
          } else {
            diagnosis.fluentFfmpeg.canProbe = true;
            diagnosis.fluentFfmpeg.testResult = 'FFprobe funcionou (mas arquivo não deveria existir)';
            console.log('⚠️ FFprobe funcionou, mas arquivo de teste existe (inesperado)');
          }
          resolve();
        });
      });
    } else {
      diagnosis.fluentFfmpeg.error = 'FFmpeg ou FFprobe não estão configurados';
      diagnosis.summary.criticalIssues.push('Não foi possível testar FFprobe: FFmpeg ou FFprobe não configurados');
      console.error('❌ Não foi possível testar: FFmpeg ou FFprobe não configurados');
    }
  } catch (error) {
    diagnosis.fluentFfmpeg.error = error.message;
    diagnosis.summary.criticalIssues.push('Erro ao testar Fluent-FFmpeg: ' + error.message);
    console.error('❌ Erro no teste Fluent-FFmpeg:', error);
  }

  // ===== TESTE 5: Verificar se há vídeos processados =====
  console.log('=== TESTE 5: Verificando vídeos existentes ===');
  try {
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const outputsDir = path.join(uploadsDir, 'outputs');
    
    if (fs.existsSync(outputsDir)) {
      const jobDirs = fs.readdirSync(outputsDir);
      diagnosis.summary.warnings.push(`Encontrados ${jobDirs.length} jobs anteriores`);
      
      // Tentar encontrar um vídeo para testar
      for (const jobId of jobDirs.slice(0, 3)) { // Testar apenas os 3 primeiros
        const jobDir = path.join(outputsDir, jobId);
        const metadataPath = path.join(jobDir, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          try {
            const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            if (metadata.videoPath && fs.existsSync(metadata.videoPath)) {
              diagnosis.summary.warnings.push(`Vídeo encontrado para teste: ${metadata.videoPath}`);
              
              // Tentar analisar este vídeo
              if (diagnosis.ffprobe.configured) {
                try {
                  await new Promise((resolve, reject) => {
                    ffmpeg.ffprobe(metadata.videoPath, (err, videoMetadata) => {
                      if (err) {
                        diagnosis.summary.criticalIssues.push(`Erro ao analisar vídeo existente: ${err.message}`);
                        console.error('❌ Erro ao analisar vídeo:', err);
                      } else {
                        diagnosis.fluentFfmpeg.testResult = `✅ FFprobe funcionou! Vídeo analisado: ${videoMetadata.format.duration}s`;
                        diagnosis.fluentFfmpeg.canProbe = true;
                        console.log('✅ FFprobe funcionou com vídeo real! Duração:', videoMetadata.format.duration);
                      }
                      resolve();
                    });
                  });
                } catch (e) {
                  diagnosis.summary.criticalIssues.push(`Erro ao testar vídeo: ${e.message}`);
                }
              }
              break; // Testar apenas o primeiro vídeo encontrado
            }
          } catch (e) {
            // Ignorar erros ao ler metadata
          }
        }
      }
    }
  } catch (error) {
    // Ignorar erros neste teste
  }

  // ===== RESUMO FINAL =====
  const allCritical = diagnosis.summary.criticalIssues.length === 0;
  const allWarnings = diagnosis.summary.warnings.length === 0;
  
  if (allCritical && diagnosis.ffmpeg.configured && diagnosis.ffprobe.configured && diagnosis.fluentFfmpeg.canProbe) {
    diagnosis.summary.status = '✅ TUDO OK';
  } else if (allCritical && diagnosis.ffmpeg.configured && diagnosis.ffprobe.configured) {
    diagnosis.summary.status = '⚠️ CONFIGURADO MAS NÃO TESTADO';
  } else if (diagnosis.ffmpeg.configured && diagnosis.ffprobe.configured) {
    diagnosis.summary.status = '⚠️ PARCIALMENTE FUNCIONAL';
  } else {
    diagnosis.summary.status = '❌ PROBLEMAS CRÍTICOS';
  }

  // Adicionar checklist
  diagnosis.summary.allChecks = [
    { name: 'FFmpeg instalado', status: diagnosis.ffmpeg.installed },
    { name: 'FFmpeg existe no sistema', status: diagnosis.ffmpeg.exists },
    { name: 'FFmpeg configurado', status: diagnosis.ffmpeg.configured },
    { name: 'FFprobe instalado', status: diagnosis.ffprobe.installed },
    { name: 'FFprobe existe no sistema', status: diagnosis.ffprobe.exists },
    { name: 'FFprobe configurado', status: diagnosis.ffprobe.configured },
    { name: 'FFprobe funcionando', status: diagnosis.fluentFfmpeg.canProbe },
    { name: 'Diretório pode ser escrito', status: diagnosis.directories.canWrite },
    { name: 'Diretório pode ser lido', status: diagnosis.directories.canRead },
  ];

  res.status(200).json({
    success: true,
    diagnosis,
    message: 'Diagnóstico completo realizado',
  });
}
