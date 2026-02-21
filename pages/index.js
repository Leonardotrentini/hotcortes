import { useState, useRef } from 'react';
import axios from 'axios';
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
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleFileSelect = (file) => {
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setJobId(null);
      setStatus(null);
      
      // Avisar se arquivo é muito grande
      const maxSize = 500 * 1024 * 1024; // 500MB
      if (file.size > maxSize) {
        alert(`⚠️ Arquivo grande detectado (${formatFileSize(file.size)})\n\nO limite é 500MB. Por favor, comprima o vídeo antes de enviar.`);
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

    // Verificar tamanho
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (videoFile.size > maxSize) {
      alert(`❌ Arquivo muito grande!\n\nTamanho: ${formatFileSize(videoFile.size)}\nLimite: 500MB\n\nPor favor, comprima o vídeo antes de enviar.`);
      return;
    }

    setUploading(true);

    try {
      // Fazer upload direto (sem compressão no frontend)
      const formData = new FormData();
      formData.append('video', videoFile);

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

      <div className={styles.actions}>
        <button
          className={styles.processBtn}
          onClick={handleUpload}
          disabled={!videoFile || uploading || processing}
        >
          {uploading ? '⏳ Enviando...' : processing ? '⏳ Processando...' : '✂️ Processar Vídeo'}
        </button>
        {videoFile && (
          <p style={{ textAlign: 'center', marginTop: '10px', color: '#666', fontSize: '0.9em' }}>
            Tamanho do vídeo: {formatFileSize(videoFile.size)} {videoFile.size > 500 * 1024 * 1024 && '(⚠️ Acima de 500MB)'}
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
            {status.status === 'completed' ? (
              '✅ Concluído!'
            ) : (
              <>
                {status.currentStep || 'Processando...'} {status.progress}%
                {status.metadata && (
                  <span style={{ display: 'block', fontSize: '0.85em', marginTop: '5px', color: '#666' }}>
                    {status.metadata.clipsCreated || 0} de {status.metadata.numberOfClips || 0} cortes criados
                  </span>
                )}
              </>
            )}
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
