import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import styles from '../styles/Home.module.css';

const DURATIONS = [
  { label: '15 segundos', value: '15s' },
  { label: '30 segundos', value: '30s' },
  { label: '1 minuto', value: '1min' },
  { label: '2 minutos', value: '2min' },
  { label: '3 minutos', value: '3min' },
  { label: '5 minutos', value: '5min' },
  { label: '8 minutos', value: '8min' },
  { label: '10 minutos', value: '10min' },
  { label: '13 minutos', value: '13min' },
  { label: '15 minutos', value: '15min' },
];

export default function Home() {
  const [videoFile, setVideoFile] = useState(null);
  const [selectedDuration, setSelectedDuration] = useState('30s');
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionInfo, setCompressionInfo] = useState(null); // { originalSize, compressedSize, success }
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);
  const ffmpegRef = useRef(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  // Carregar FFmpeg uma vez
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;

        ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg:', message);
        });

        ffmpeg.on('progress', ({ progress }) => {
          setCompressionProgress(Math.round(progress * 100));
        });

        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });

        setFfmpegLoaded(true);
        console.log('FFmpeg carregado com sucesso');
      } catch (error) {
        console.error('Erro ao carregar FFmpeg:', error);
      }
    };

    loadFFmpeg();
  }, []);

  // Função para comprimir vídeo
  const compressVideo = async (file) => {
    const maxSize = 500 * 1024 * 1024; // 500MB (Railway permite mais, mas comprimir se muito grande)
    const originalSize = file.size;
    
    // Se já está abaixo do limite, não precisa comprimir
    if (originalSize <= maxSize) {
      setCompressionInfo({
        originalSize,
        compressedSize: originalSize,
        success: true,
        needsCompression: false
      });
      return file;
    }

    if (!ffmpegLoaded || !ffmpegRef.current) {
      throw new Error('FFmpeg ainda não foi carregado. Aguarde alguns segundos.');
    }

    setCompressing(true);
    setCompressionProgress(0);
    setCompressionInfo({
      originalSize,
      compressedSize: null,
      success: false,
      needsCompression: true
    });

    try {
      const ffmpeg = ffmpegRef.current;
      const inputFileName = 'input.' + file.name.split('.').pop();
      const outputFileName = 'output.mp4';

      console.log('Iniciando compressão...');
      console.log('Tamanho original:', formatFileSize(originalSize));

      // Escrever arquivo de entrada
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));
      console.log('Arquivo carregado no FFmpeg');

      // Calcular qualidade baseada no tamanho original
      const originalSizeMB = originalSize / (1024 * 1024);
      let crf = 28; // Qualidade padrão (maior = menor arquivo)
      let scale = '1920:1080'; // Resolução padrão
      let compressionLevel = 'Médio';

      // Ajustar qualidade baseado no tamanho
      if (originalSizeMB > 200) {
        crf = 32;
        scale = '1280:720';
        compressionLevel = 'Alto';
      } else if (originalSizeMB > 100) {
        crf = 30;
        scale = '1280:720';
        compressionLevel = 'Médio-Alto';
      } else if (originalSizeMB > 50) {
        crf = 28;
        scale = '1920:1080';
        compressionLevel = 'Médio';
      }

      console.log(`Compressão configurada: CRF=${crf}, Resolução=${scale}, Nível=${compressionLevel}`);

      // Executar compressão
      await ffmpeg.exec([
        '-i', inputFileName,
        '-c:v', 'libx264',
        '-crf', crf.toString(),
        '-preset', 'fast',
        '-vf', `scale=${scale}:force_original_aspect_ratio=decrease`,
        '-c:a', 'aac',
        '-b:a', '128k',
        '-movflags', '+faststart',
        outputFileName
      ]);

      // Ler arquivo comprimido
      const data = await ffmpeg.readFile(outputFileName);
      const compressedBlob = new Blob([data], { type: 'video/mp4' });
      const compressedFile = new File([compressedBlob], file.name, { type: 'video/mp4' });
      const compressedSize = compressedFile.size;

      // Limpar arquivos temporários
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      const reduction = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);
      const success = compressedSize <= maxSize;

      setCompressionInfo({
        originalSize,
        compressedSize,
        success,
        needsCompression: true,
        reduction: parseFloat(reduction),
        compressionLevel
      });

      setCompressing(false);
      setCompressionProgress(0);

      console.log(`✅ Compressão concluída: ${formatFileSize(originalSize)} → ${formatFileSize(compressedSize)} (${reduction}% de redução)`);
      console.log(`Status: ${success ? '✅ Dentro do limite' : '⚠️ Ainda acima do limite'}`);

      return compressedFile;
    } catch (error) {
      setCompressing(false);
      setCompressionProgress(0);
      setCompressionInfo({
        originalSize,
        compressedSize: null,
        success: false,
        needsCompression: true,
        error: error.message
      });
      console.error('Erro na compressão:', error);
      throw error;
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setJobId(null);
      setStatus(null);
      setCompressionInfo(null); // Limpar info de compressão anterior
      
      // Mostrar aviso se arquivo é grande
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        // Não bloquear, apenas informar que será comprimido
        console.log('Arquivo grande detectado, será comprimido automaticamente');
      }
    } else {
      alert('Por favor, selecione um arquivo de vídeo válido (MP4, MOV, AVI, MKV, WEBM)');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dragCounter.current--;
  };

  const handleUpload = async () => {
    if (!videoFile) {
      alert('Por favor, selecione um vídeo primeiro');
      return;
    }

    // Se já tentou comprimir e não deu certo, não permitir upload
    if (compressionInfo && !compressionInfo.success) {
      alert('❌ Não é possível fazer upload. O vídeo ainda está acima de 500MB após compressão.\n\nPor favor, tente com um vídeo menor ou comprima manualmente.');
      return;
    }

    setUploading(true);
    setCompressionInfo(null); // Limpar info anterior
    let fileToUpload = videoFile;

    try {
      // Comprimir automaticamente se necessário (Railway permite até 500MB, mas comprimir se muito grande)
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (videoFile.size > maxSize) {
        if (!ffmpegLoaded) {
          alert('⏳ FFmpeg ainda está carregando. Aguarde alguns segundos e tente novamente.');
          setUploading(false);
          return;
        }

        try {
          console.log('Iniciando compressão automática...');
          fileToUpload = await compressVideo(videoFile);
          
          // Verificar resultado da compressão baseado no tamanho do arquivo
          if (fileToUpload.size > maxSize) {
            console.log('⚠️ Compressão não foi suficiente. Tamanho:', formatFileSize(fileToUpload.size));
            // Aguardar para compressionInfo ser atualizado
            await new Promise(resolve => setTimeout(resolve, 200));
            setUploading(false);
            // A mensagem já será mostrada pelo componente de UI via compressionInfo
            return;
          }
          
          // Se chegou aqui e compressionInfo ainda não mostra sucesso, atualizar
          if (!compressionInfo || !compressionInfo.success) {
            setCompressionInfo({
              originalSize: videoFile.size,
              compressedSize: fileToUpload.size,
              success: true,
              needsCompression: true,
              reduction: ((videoFile.size - fileToUpload.size) / videoFile.size * 100).toFixed(1)
            });
          }
          
          // Se chegou aqui, compressão foi bem-sucedida
          console.log('✅ Compressão bem-sucedida! Tamanho final:', formatFileSize(fileToUpload.size));
        } catch (compressionError) {
          console.error('Erro na compressão:', compressionError);
          const errorMsg = compressionError.message || 'Erro desconhecido';
          alert(`❌ Erro ao comprimir vídeo\n\n${errorMsg}\n\nTente comprimir manualmente ou use um vídeo menor.`);
          setUploading(false);
          setCompressionInfo(null);
          return;
        }
      } else {
        // Arquivo já está dentro do limite
        setCompressionInfo({
          originalSize: videoFile.size,
          compressedSize: videoFile.size,
          success: true,
          needsCompression: false
        });
      }

      // Fazer upload
      const formData = new FormData();
      formData.append('video', fileToUpload);

      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setJobId(response.data.jobId);
        setUploading(false);
        
        // Iniciar processamento
        await handleProcess(response.data.jobId);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      let errorMessage = 'Erro desconhecido';
      
      if (error.response) {
        // Erro da API
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 413) {
          errorMessage = '❌ Arquivo muito grande!\n\nO arquivo excede o limite de 500MB.\nPor favor, comprima o vídeo antes de enviar.';
        } else if (status === 400) {
          errorMessage = data?.error || 'Arquivo inválido. Verifique o formato e tamanho.';
        } else if (status === 500) {
          errorMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
        } else {
          errorMessage = data?.error || data?.message || `Erro ${status}: ${JSON.stringify(data)}`;
        }
      } else if (error.request) {
        // Erro de rede
        errorMessage = '❌ Erro de conexão!\n\nVerifique sua internet e tente novamente.';
      } else {
        // Outro erro
        errorMessage = error.message || 'Erro ao fazer upload';
      }
      
      alert('Erro ao fazer upload do vídeo:\n\n' + errorMessage);
      setUploading(false);
    }
  };

  const handleProcess = async (id) => {
    setProcessing(true);
    try {
      const response = await axios.post('/api/process', {
        jobId: id || jobId,
        duration: selectedDuration,
      });

      if (response.data.success) {
        // Iniciar polling de status
        startStatusPolling(id || jobId);
      }
    } catch (error) {
      console.error('Erro no processamento:', error);
      alert('Erro ao processar vídeo: ' + (error.response?.data?.error || error.message));
      setProcessing(false);
    }
  };

  const startStatusPolling = (id) => {
    let attempts = 0;
    const maxAttempts = 300; // 10 minutos (300 * 2s)

    const poll = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.get(`/api/status?jobId=${id}`);
        setStatus(response.data);

        if (response.data.status === 'completed' || attempts >= maxAttempts) {
          clearInterval(poll);
          setProcessing(false);
          if (attempts >= maxAttempts) {
            alert('Tempo limite excedido. Verifique o status manualmente.');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setProcessing(false);
        }
      }
    }, 2000); // Poll a cada 2 segundos
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🎬 CortesHot</h1>
      <p className={styles.subtitle}>Ferramenta de corte automático de vídeos</p>

      <div className={styles.uploadSection}>
        <h2>1. Faça upload do vídeo</h2>
        <div
          className={styles.uploadArea}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />
          <div className={styles.uploadContent}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p>Clique para selecionar ou arraste um vídeo</p>
            {videoFile && (
              <span className={styles.fileInfo}>
                {videoFile.name} ({formatFileSize(videoFile.size)})
              </span>
            )}
          </div>
        </div>

        {videoFile && (
          <div className={styles.videoPreview}>
            <video
              src={URL.createObjectURL(videoFile)}
              controls
              style={{ maxWidth: '100%', borderRadius: '10px' }}
            />
          </div>
        )}
      </div>

      <div className={styles.durationSection}>
        <h2>2. Selecione a duração dos cortes</h2>
        <div className={styles.durationGrid}>
          {DURATIONS.map((dur) => (
            <button
              key={dur.value}
              className={`${styles.durationBtn} ${
                selectedDuration === dur.value ? styles.active : ''
              }`}
              onClick={() => setSelectedDuration(dur.value)}
            >
              {dur.label}
            </button>
          ))}
        </div>
      </div>

      {compressing && (
        <div className={styles.compressionSection}>
          <h3>🔄 Comprimindo vídeo automaticamente...</h3>
          {compressionInfo && (
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '0.9em', color: '#856404' }}>
                📊 Tamanho original: <strong>{formatFileSize(compressionInfo.originalSize)}</strong>
              </p>
            </div>
          )}
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${compressionProgress}%` }}
            />
          </div>
          <p className={styles.progressText}>{compressionProgress}%</p>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
            Isso pode levar alguns minutos dependendo do tamanho do vídeo...
          </p>
        </div>
      )}

      {compressionInfo && !compressing && (
        <div className={`${styles.compressionSection} ${compressionInfo.success ? styles.success : styles.warning}`}>
          {compressionInfo.success ? (
            <>
              <h3>✅ Compressão Concluída!</h3>
              <div style={{ marginTop: '15px', textAlign: 'left' }}>
                <p><strong>📊 Tamanho original:</strong> {formatFileSize(compressionInfo.originalSize)}</p>
                <p><strong>📦 Tamanho após compressão:</strong> {formatFileSize(compressionInfo.compressedSize)}</p>
                {compressionInfo.reduction && (
                  <p><strong>📉 Redução:</strong> {compressionInfo.reduction}%</p>
                )}
                {compressionInfo.compressionLevel && (
                  <p><strong>⚙️ Nível de compressão:</strong> {compressionInfo.compressionLevel}</p>
                )}
                <p style={{ marginTop: '10px', color: '#2e7d32', fontWeight: 'bold' }}>
                  ✅ Pronto para upload! (Dentro do limite de 500MB)
                </p>
              </div>
            </>
          ) : (
            <>
              <h3>⚠️ Compressão Concluída, mas Ainda Acima do Limite</h3>
              <div style={{ marginTop: '15px', textAlign: 'left' }}>
                <p><strong>📊 Tamanho original:</strong> {formatFileSize(compressionInfo.originalSize)}</p>
                <p><strong>📦 Tamanho após compressão:</strong> {formatFileSize(compressionInfo.compressedSize || 0)}</p>
                {compressionInfo.reduction && (
                  <p><strong>📉 Redução:</strong> {compressionInfo.reduction}%</p>
                )}
                <p style={{ marginTop: '10px', color: '#c62828', fontWeight: 'bold' }}>
                  ❌ Ainda acima de 500MB. Não será possível fazer upload.
                </p>
                <div style={{ marginTop: '15px', padding: '10px', background: '#fff3cd', borderRadius: '5px' }}>
                  <p style={{ margin: 0, fontSize: '0.9em' }}>
                    <strong>💡 Opções:</strong><br/>
                    • Tente com um vídeo menor<br/>
                    • Comprima manualmente antes<br/>
                    • Use um vídeo com resolução menor
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.processBtn}
          onClick={handleUpload}
          disabled={!videoFile || uploading || processing || compressing || (compressionInfo && !compressionInfo.success)}
        >
          {compressing ? '🔄 Comprimindo...' : uploading ? '⏳ Enviando...' : processing ? '⏳ Processando...' : compressionInfo && !compressionInfo.success ? '❌ Não é possível processar' : '✂️ Processar Vídeo'}
        </button>
        {videoFile && videoFile.size > 50 * 1024 * 1024 && !compressing && !compressionInfo && (
          <p style={{ textAlign: 'center', marginTop: '10px', color: '#856404', fontSize: '0.9em' }}>
            ⚠️ Vídeo será comprimido automaticamente antes do upload
          </p>
        )}
      </div>

      {status && (
        <div className={styles.statusSection}>
          <h2>Status do Processamento</h2>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${status.progress}%` }}
            />
          </div>
          <p className={styles.progressText}>
            {status.status === 'completed' ? '✅ Concluído!' : `Processando... ${status.progress}%`}
          </p>

          {status.status === 'completed' && (
            <div className={styles.downloadSection}>
              <h3>Downloads Disponíveis</h3>
              <a
                href={status.downloadUrl}
                className={styles.downloadBtn}
                download
              >
                📦 Baixar ZIP Completo
              </a>
              <div className={styles.clipsList}>
                <h4>Cortes Individuais:</h4>
                {status.clips.map((clip, index) => (
                  <a
                    key={index}
                    href={clip.url}
                    className={styles.clipLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    🎬 {clip.name}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
