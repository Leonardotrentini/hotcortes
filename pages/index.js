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
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size <= maxSize) {
      return file; // Não precisa comprimir
    }

    if (!ffmpegLoaded || !ffmpegRef.current) {
      throw new Error('FFmpeg ainda não foi carregado. Aguarde alguns segundos.');
    }

    setCompressing(true);
    setCompressionProgress(0);

    try {
      const ffmpeg = ffmpegRef.current;
      const inputFileName = 'input.' + file.name.split('.').pop();
      const outputFileName = 'output.mp4';

      // Escrever arquivo de entrada
      await ffmpeg.writeFile(inputFileName, await fetchFile(file));

      // Calcular qualidade baseada no tamanho original
      const originalSizeMB = file.size / (1024 * 1024);
      let crf = 28; // Qualidade padrão (maior = menor arquivo)
      let scale = '1920:1080'; // Resolução padrão

      // Ajustar qualidade baseado no tamanho
      if (originalSizeMB > 200) {
        crf = 32;
        scale = '1280:720';
      } else if (originalSizeMB > 100) {
        crf = 30;
        scale = '1280:720';
      } else if (originalSizeMB > 50) {
        crf = 28;
        scale = '1920:1080';
      }

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

      // Limpar arquivos temporários
      await ffmpeg.deleteFile(inputFileName);
      await ffmpeg.deleteFile(outputFileName);

      setCompressing(false);
      setCompressionProgress(0);

      console.log(`Compressão concluída: ${formatFileSize(file.size)} → ${formatFileSize(compressedFile.size)}`);

      return compressedFile;
    } catch (error) {
      setCompressing(false);
      setCompressionProgress(0);
      console.error('Erro na compressão:', error);
      throw error;
    }
  };

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setJobId(null);
      setStatus(null);
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

    setUploading(true);
    let fileToUpload = videoFile;

    try {
      // Comprimir automaticamente se necessário
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (videoFile.size > maxSize) {
        if (!ffmpegLoaded) {
          alert('FFmpeg ainda está carregando. Aguarde alguns segundos e tente novamente.');
          setUploading(false);
          return;
        }

        try {
          fileToUpload = await compressVideo(videoFile);
          
          // Verificar se ainda está acima do limite após compressão
          if (fileToUpload.size > maxSize) {
            alert(`⚠️ O vídeo foi comprimido, mas ainda está acima de 50MB.\n\nTamanho original: ${formatFileSize(videoFile.size)}\nTamanho após compressão: ${formatFileSize(fileToUpload.size)}\n\nTente com um vídeo menor ou faça upgrade para plano Pro (100MB).`);
            setUploading(false);
            return;
          }
        } catch (compressionError) {
          console.error('Erro na compressão:', compressionError);
          alert(`Erro ao comprimir vídeo: ${compressionError.message}\n\nTente comprimir manualmente ou use um vídeo menor.`);
          setUploading(false);
          return;
        }
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
          errorMessage = '❌ Arquivo muito grande!\n\nO arquivo excede o limite de 50MB.\nPor favor, comprima o vídeo antes de enviar.';
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

      <div className={styles.actions}>
        <button
          className={styles.processBtn}
          onClick={handleUpload}
          disabled={!videoFile || uploading || processing || compressing}
        >
          {compressing ? '🔄 Comprimindo...' : uploading ? '⏳ Enviando...' : processing ? '⏳ Processando...' : '✂️ Processar Vídeo'}
        </button>
        {videoFile && videoFile.size > 50 * 1024 * 1024 && !compressing && (
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
