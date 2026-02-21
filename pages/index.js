import { useState, useRef, useEffect } from 'react';
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
  const [activeTab, setActiveTab] = useState('cortes'); // 'cortes' ou 'telegram'
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

      {/* Abas de Navegação */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'cortes' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('cortes')}
        >
          ✂️ Cortes de Vídeo
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'telegram' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('telegram')}
        >
          📱 Telegram Bot
        </button>
      </div>

      {/* Conteúdo da Aba de Cortes */}
      {activeTab === 'cortes' && (
        <>
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
        </>
      )}

      {/* Conteúdo da Aba de Telegram */}
      {activeTab === 'telegram' && (
        <TelegramTab />
      )}
    </div>
  );
}

// Componente da Aba Telegram
function TelegramTab() {
  const [botToken, setBotToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [newChannel, setNewChannel] = useState({ id: '', title: '' });
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'pending', 'sent', 'failed'
  const [searchText, setSearchText] = useState('');
  const [selectedPost, setSelectedPost] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [messageStats, setMessageStats] = useState({});
  const [showStats, setShowStats] = useState(false);
  const [statsFilter, setStatsFilter] = useState('all'); // 'all', 'best', 'worst'
  
  // Formulário de nova postagem
  const [newPost, setNewPost] = useState({
    channelId: '',
    message: '',
    date: '',
    time: '',
    mediaUrl: '',
  });

  const checkConnection = async () => {
    try {
      const response = await axios.get('/api/telegram/status');
      if (response.data.connected) {
        setIsConnected(true);
        setBotToken('***' + response.data.botInfo.username); // Mascarar token
        loadChannels();
      }
    } catch (error) {
      setIsConnected(false);
    }
  };

  const loadChannels = async () => {
    try {
      const response = await axios.get('/api/telegram/channels');
      setChannels(response.data.channels || []);
    } catch (error) {
      console.error('Erro ao carregar canais:', error);
    }
  };

  const loadScheduledPosts = async () => {
    try {
      const response = await axios.get('/api/telegram/scheduled');
      setScheduledPosts(response.data.posts || []);
    } catch (error) {
      console.error('Erro ao carregar postagens agendadas:', error);
    }
  };

  const loadMessageStats = async () => {
    try {
      const response = await axios.get('/api/telegram/all-stats');
      setMessageStats(response.data.stats || {});
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Funções auxiliares
  const getPostStats = (post) => {
    if (!post.messageId) return null;
    const messageKey = `${post.channelId}_${post.messageId}`;
    return messageStats[messageKey] || null;
  };

  const getTotalReactions = (stats) => {
    if (!stats || !stats.reactions) return 0;
    return Object.values(stats.reactions).reduce((sum, count) => sum + (count || 0), 0);
  };

  const getPostPerformance = (post) => {
    const stats = getPostStats(post);
    if (!stats) return null;
    
    const reactions = getTotalReactions(stats);
    const views = stats.views || 0;
    const forwards = stats.forwards || 0;
    
    // Score simples: reações + forwards + (views/100)
    const score = reactions + forwards + (views / 100);
    
    return {
      score,
      reactions,
      views,
      forwards,
      stats,
    };
  };

  const getTimeRemaining = (scheduledFor) => {
    const now = new Date();
    const scheduled = new Date(scheduledFor);
    const diff = scheduled - now;
    
    if (diff < 0) return 'Tempo esgotado';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    return `${minutes}min`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: '⏳ Pendente', color: '#ff9800' },
      sent: { text: '✅ Enviada', color: '#4caf50' },
      failed: { text: '❌ Falhou', color: '#f44336' }
    };
    return badges[status] || badges.pending;
  };

  // Filtrar postagens
  const filteredPosts = scheduledPosts.filter(post => {
    // Filtro por canal
    if (filterChannel && post.channelId !== filterChannel) return false;
    
    // Filtro por status
    if (filterStatus !== 'all' && (post.status || 'pending') !== filterStatus) return false;
    
    // Busca por texto
    if (searchText && !post.message.toLowerCase().includes(searchText.toLowerCase())) return false;
    
    return true;
  });

  // Agrupar por canal para estatísticas
  const postsByChannel = scheduledPosts.reduce((acc, post) => {
    const channelName = channels.find(c => c.id === post.channelId)?.title || 
                       post.channelTitle || 
                       `Canal ${post.channelId}`;
    if (!acc[channelName]) {
      acc[channelName] = { total: 0, pending: 0, sent: 0, failed: 0 };
    }
    acc[channelName].total++;
    acc[channelName][post.status || 'pending']++;
    return acc;
  }, {});

  // Agrupar por dia da semana/data
  const postsByDate = filteredPosts.reduce((acc, post) => {
    const postDate = new Date(post.scheduledFor);
    const dateKey = postDate.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayOfWeek = postDate.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dateOnly = postDate.toISOString().split('T')[0];
    
    if (!acc[dateOnly]) {
      acc[dateOnly] = {
        date: dateOnly,
        dateFormatted: dateKey,
        dayOfWeek: dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1),
        posts: []
      };
    }
    acc[dateOnly].posts.push(post);
    return acc;
  }, {});

  // Ordenar por data
  const sortedDates = Object.keys(postsByDate).sort((a, b) => new Date(a) - new Date(b));

  const handleConnect = async () => {
    if (!botToken || botToken.length < 20) {
      alert('❌ Token inválido! Por favor, insira um token válido do BotFather.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/telegram/connect', { token: botToken });
      if (response.data.success) {
        setIsConnected(true);
        setBotToken('***' + response.data.botInfo.username);
        await loadChannels();
        await loadScheduledPosts();
        alert('✅ Bot conectado com sucesso!');
      }
    } catch (error) {
      alert('❌ Erro ao conectar bot: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar o bot?')) return;

    try {
      await axios.post('/api/telegram/disconnect');
      setIsConnected(false);
      setBotToken('');
      setChannels([]);
      setScheduledPosts([]);
      alert('✅ Bot desconectado');
    } catch (error) {
      alert('❌ Erro ao desconectar: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleMediaUpload = async (file) => {
    if (!file) return null;

    setUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('media', file);

      const response = await axios.post('/api/telegram/upload-media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return response.data.mediaUrl;
      }
      return null;
    } catch (error) {
      console.error('Erro ao fazer upload de mídia:', error);
      alert('❌ Erro ao fazer upload de mídia: ' + (error.response?.data?.error || error.message));
      return null;
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleMediaFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setMediaFile(file);
      
      // Criar preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setMediaPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setMediaPreview(null);
      }
    }
  };

  const handleSchedulePost = async (e) => {
    e.preventDefault();
    
    if (!newPost.channelId || !newPost.message || !newPost.date || !newPost.time) {
      alert('❌ Preencha todos os campos obrigatórios!');
      return;
    }

    try {
      let finalMediaUrl = newPost.mediaUrl;
      
      // Se houver arquivo, fazer upload primeiro
      if (mediaFile) {
        setUploadingMedia(true);
        const uploadedUrl = await handleMediaUpload(mediaFile);
        if (uploadedUrl) {
          finalMediaUrl = uploadedUrl;
        } else {
          alert('❌ Erro ao fazer upload do arquivo. Tente novamente.');
          setUploadingMedia(false);
          return;
        }
        setUploadingMedia(false);
      }

      const response = await axios.post('/api/telegram/schedule', {
        ...newPost,
        mediaUrl: finalMediaUrl || null,
      });

      if (response.data.success) {
        alert('✅ Postagem agendada com sucesso!');
        setNewPost({ channelId: '', message: '', date: '', time: '', mediaUrl: '' });
        setMediaFile(null);
        setMediaPreview(null);
        loadScheduledPosts();
      }
    } catch (error) {
      alert('❌ Erro ao agendar: ' + (error.response?.data?.error || error.message));
      setUploadingMedia(false);
    }
  };

  const handleSendNow = async (channelId, message, mediaUrl) => {
    if (!confirm('Enviar mensagem agora?')) return;

    try {
      const response = await axios.post('/api/telegram/send', {
        channelId,
        message,
        mediaUrl,
      });
      if (response.data.success) {
        alert('✅ Mensagem enviada com sucesso!');
      }
    } catch (error) {
      alert('❌ Erro ao enviar: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleDeleteScheduled = async (postId) => {
    if (!confirm('Cancelar esta postagem agendada?')) return;

    try {
      await axios.delete(`/api/telegram/scheduled/${postId}`);
      loadScheduledPosts();
      alert('✅ Postagem cancelada');
    } catch (error) {
      alert('❌ Erro ao cancelar: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleAddChannel = async (e) => {
    e.preventDefault();
    
    if (!newChannel.id || newChannel.id.trim() === '') {
      alert('❌ Por favor, insira o ID do canal!');
      return;
    }

    try {
      // Converter para os nomes que o backend espera
      const response = await axios.post('/api/telegram/channels/add', {
        channelId: newChannel.id.trim(),
        channelTitle: newChannel.title.trim() || undefined
      });
      if (response.data.success) {
        alert('✅ Canal adicionado com sucesso!');
        setNewChannel({ id: '', title: '' });
        setShowAddChannel(false);
        loadChannels();
      }
    } catch (error) {
      alert('❌ Erro ao adicionar canal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleRemoveChannel = async (channelId) => {
    if (!confirm('Remover este canal da lista?')) return;

    try {
      await axios.delete(`/api/telegram/channels/remove?channelId=${channelId}`);
      alert('✅ Canal removido!');
      loadChannels();
    } catch (error) {
      alert('❌ Erro ao remover canal: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleEditPost = async (e) => {
    e.preventDefault();
    
    if (!selectedPost) return;

    try {
      const response = await axios.put(`/api/telegram/scheduled/${selectedPost.id}`, {
        message: selectedPost.message,
        scheduledFor: selectedPost.scheduledFor,
        mediaUrl: selectedPost.mediaUrl || null,
      });

      if (response.data.success) {
        alert('✅ Postagem atualizada com sucesso!');
        setShowEditModal(false);
        setSelectedPost(null);
        loadScheduledPosts();
      }
    } catch (error) {
      alert('❌ Erro ao atualizar postagem: ' + (error.response?.data?.error || error.message));
    }
  };

  // Carregar status ao montar componente
  useEffect(() => {
    checkConnection();
    loadScheduledPosts();
    loadMessageStats();
    
    // Atualizar estatísticas a cada 30 segundos
    const statsInterval = setInterval(() => {
      if (isConnected) {
        loadMessageStats();
      }
    }, 30000);
    
    return () => clearInterval(statsInterval);
  }, [isConnected]);

  return (
    <div className={styles.telegramSection}>
      <h2>📱 Configuração do Bot Telegram</h2>

      {/* Manual */}
      <div className={styles.manualSection}>
        <button
          className={styles.manualBtn}
          onClick={() => setShowManual(!showManual)}
        >
          {showManual ? '📖 Ocultar Manual' : '📖 Ver Manual: Como Criar e Configurar o Bot'}
        </button>

        {showManual && (
          <div className={styles.manualContent}>
            <h3>📚 Manual Completo - Bot Telegram</h3>
            
            <div className={styles.manualStep}>
              <h4>Passo 1: Criar o Bot no Telegram</h4>
              <ol>
                <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
                <li>Inicie uma conversa e envie: <code>/newbot</code></li>
                <li>Escolha um nome para seu bot (ex: "Meu Bot de Postagens")</li>
                <li>Escolha um username único (deve terminar com "bot", ex: "meubot_postagens_bot")</li>
                <li>O BotFather retornará um <strong>TOKEN</strong> - copie e guarde!</li>
              </ol>
              <p><strong>⚠️ Importante:</strong> Nunca compartilhe seu token com ninguém!</p>
            </div>

            <div className={styles.manualStep}>
              <h4>Passo 2: Adicionar o Bot aos Canais</h4>
              <ol>
                <li>Vá até o canal onde deseja postar</li>
                <li>Clique em <strong>Administradores</strong> → <strong>Adicionar Administrador</strong></li>
                <li>Procure pelo username do seu bot (ex: @meubot_postagens_bot)</li>
                <li>Dê permissão de <strong>"Postar Mensagens"</strong></li>
                <li>Opcional: Dê outras permissões se necessário</li>
              </ol>
              <p><strong>💡 Dica:</strong> O bot precisa ser administrador do canal para postar!</p>
            </div>

            <div className={styles.manualStep}>
              <h4>Passo 3: Obter o ID do Canal</h4>
              <ol>
                <li>Adicione o bot <strong>@userinfobot</strong> ao seu canal</li>
                <li>Ou use o formato: <code>@canaisual</code> (se o canal for público)</li>
                <li>O ID do canal será mostrado automaticamente quando você conectar o bot aqui</li>
              </ol>
              <p><strong>💡 Alternativa:</strong> Use o formato <code>@nome_do_canal</code> se o canal for público</p>
            </div>

            <div className={styles.manualStep}>
              <h4>Passo 4: Conectar o Bot Aqui</h4>
              <ol>
                <li>Cole o token do BotFather no campo abaixo</li>
                <li>Clique em "Conectar Bot"</li>
                <li>Se conectado, os canais aparecerão automaticamente</li>
              </ol>
            </div>

            <div className={styles.manualStep}>
              <h4>📝 Formato do Token</h4>
              <p>O token tem este formato:</p>
              <code>123456789:ABCdefGHIjklMNOpqrsTUVwxyz</code>
              <p>Geralmente tem cerca de 45-50 caracteres</p>
            </div>
          </div>
        )}
      </div>

      {/* Conexão do Bot */}
      <div className={styles.botConnection}>
        <h3>🔌 Conectar Bot</h3>
        {!isConnected ? (
          <div className={styles.connectForm}>
            <input
              type="password"
              placeholder="Cole aqui o token do BotFather"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className={styles.tokenInput}
            />
            <button
              onClick={handleConnect}
              disabled={loading || !botToken}
              className={styles.connectBtn}
            >
              {loading ? '⏳ Conectando...' : '🔗 Conectar Bot'}
            </button>
          </div>
        ) : (
          <div className={styles.connectedStatus}>
            <p>✅ Bot conectado: {botToken}</p>
            <button onClick={handleDisconnect} className={styles.disconnectBtn}>
              🔌 Desconectar
            </button>
            <button onClick={loadChannels} className={styles.refreshBtn}>
              🔄 Atualizar Canais
            </button>
          </div>
        )}
      </div>

      {/* Lista de Canais */}
      {isConnected && (
        <div className={styles.channelsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h3>📺 Canais Disponíveis</h3>
            <button
              onClick={() => setShowAddChannel(!showAddChannel)}
              className={styles.addChannelBtn}
            >
              {showAddChannel ? '❌ Cancelar' : '➕ Adicionar Canal'}
            </button>
          </div>

          {/* Formulário para adicionar canal */}
          {showAddChannel && (
            <form onSubmit={handleAddChannel} className={styles.addChannelForm}>
              <input
                type="text"
                placeholder="ID do Canal (ex: -1001234567890 ou @nome_do_canal)"
                value={newChannel.id}
                onChange={(e) => setNewChannel({ ...newChannel, id: e.target.value })}
                required
                className={styles.formInput}
                style={{ marginBottom: '10px' }}
              />
              <input
                type="text"
                placeholder="Nome do Canal (opcional)"
                value={newChannel.title}
                onChange={(e) => setNewChannel({ ...newChannel, title: e.target.value })}
                className={styles.formInput}
                style={{ marginBottom: '10px' }}
              />
              <button type="submit" className={styles.addChannelSubmitBtn}>
                ✅ Adicionar Canal
              </button>
            </form>
          )}

          {channels.length > 0 ? (
            <div className={styles.channelsList}>
              {channels.map((channel) => (
                <div key={channel.id} className={styles.channelItem}>
                  <div style={{ flex: 1 }}>
                    <strong>{channel.title || channel.username || `Canal ${channel.id}`}</strong>
                    <span className={styles.channelId}>ID: {channel.id}</span>
                    {channel.username && (
                      <span className={styles.channelUsername}>@{channel.username}</span>
                    )}
                    {channel.error && (
                      <span style={{ display: 'block', color: '#f44336', fontSize: '0.85em', marginTop: '5px' }}>
                        ⚠️ {channel.error}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveChannel(channel.id)}
                    className={styles.removeChannelBtn}
                    title="Remover canal"
                  >
                    🗑️
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
              Nenhum canal adicionado. Clique em "➕ Adicionar Canal" para começar.
            </p>
          )}
        </div>
      )}

      {/* Agendar Postagem */}
      {isConnected && (
        <div className={styles.scheduleSection}>
          <h3>📅 Agendar Postagem</h3>
          <form onSubmit={handleSchedulePost} className={styles.scheduleForm}>
            <select
              value={newPost.channelId}
              onChange={(e) => setNewPost({ ...newPost, channelId: e.target.value })}
              required
              className={styles.formInput}
            >
              <option value="">Selecione o canal...</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  {channel.title || channel.username || `Canal ${channel.id}`}
                </option>
              ))}
            </select>

            <textarea
              placeholder="Digite a mensagem que será enviada..."
              value={newPost.message}
              onChange={(e) => setNewPost({ ...newPost, message: e.target.value })}
              required
              rows={4}
              className={styles.formInput}
            />

            <div className={styles.dateTimeRow}>
              <input
                type="date"
                value={newPost.date}
                onChange={(e) => setNewPost({ ...newPost, date: e.target.value })}
                required
                className={styles.formInput}
              />
              <input
                type="time"
                value={newPost.time}
                onChange={(e) => setNewPost({ ...newPost, time: e.target.value })}
                required
                className={styles.formInput}
              />
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#555' }}>
                📎 Mídia (opcional):
              </label>
              
              {/* Upload de Arquivo */}
              <div style={{ marginBottom: '10px' }}>
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaFileSelect}
                  className={styles.formInput}
                  style={{ padding: '8px' }}
                  id="mediaFileInput"
                />
                {mediaFile && (
                  <div style={{ marginTop: '8px', padding: '10px', background: '#f5f5f5', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {mediaPreview && (
                        <img 
                          src={mediaPreview} 
                          alt="Preview" 
                          style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '6px' }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <strong>{mediaFile.name}</strong>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>
                          {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                            document.getElementById('mediaFileInput').value = '';
                          }}
                          style={{
                            marginTop: '5px',
                            padding: '4px 12px',
                            background: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85em'
                          }}
                        >
                          ❌ Remover
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Ou URL */}
              <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '8px', textAlign: 'center' }}>
                <strong>OU</strong>
              </div>
              
              <input
                type="url"
                placeholder="URL da mídia (vídeo, imagem) - Opcional"
                value={newPost.mediaUrl}
                onChange={(e) => setNewPost({ ...newPost, mediaUrl: e.target.value })}
                className={styles.formInput}
                disabled={!!mediaFile}
              />
            </div>

            <button 
              type="submit" 
              className={styles.scheduleBtn}
              disabled={uploadingMedia}
            >
              {uploadingMedia ? '⏳ Enviando arquivo...' : '📅 Agendar Postagem'}
            </button>
          </form>
        </div>
      )}

      {/* Postagens Agendadas */}
      {isConnected && (
        <div className={styles.scheduledSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h3>⏰ Postagens Agendadas ({filteredPosts.length})</h3>
              <button
                onClick={() => {
                  setShowStats(!showStats);
                  if (!showStats) {
                    loadMessageStats();
                  }
                }}
                className={styles.refreshBtn}
                style={{ padding: '8px 16px', background: showStats ? '#4caf50' : '#667eea' }}
              >
                {showStats ? '📊 Ocultar Estatísticas' : '📊 Ver Estatísticas'}
              </button>
              {showStats && (
                <select
                  value={statsFilter}
                  onChange={(e) => setStatsFilter(e.target.value)}
                  className={styles.formInput}
                  style={{ minWidth: '150px', padding: '8px 12px' }}
                >
                  <option value="all">Todas</option>
                  <option value="best">⭐ Melhores</option>
                  <option value="worst">📉 Piores</option>
                </select>
              )}
            </div>
            
            {/* Filtros e Busca */}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="🔍 Buscar mensagem..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className={styles.formInput}
                style={{ minWidth: '200px', padding: '8px 12px' }}
              />
              
              <select
                value={filterChannel}
                onChange={(e) => setFilterChannel(e.target.value)}
                className={styles.formInput}
                style={{ minWidth: '150px', padding: '8px 12px' }}
              >
                <option value="">Todos os canais</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title || channel.username || `Canal ${channel.id}`}
                  </option>
                ))}
              </select>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={styles.formInput}
                style={{ minWidth: '120px', padding: '8px 12px' }}
              >
                <option value="all">Todos</option>
                <option value="pending">⏳ Pendente</option>
                <option value="sent">✅ Enviada</option>
                <option value="failed">❌ Falhou</option>
              </select>
              
              <button
                onClick={() => {
                  setFilterChannel('');
                  setFilterStatus('all');
                  setSearchText('');
                }}
                className={styles.refreshBtn}
                style={{ padding: '8px 16px' }}
              >
                🔄 Limpar
              </button>
            </div>
          </div>

          {/* Estatísticas por Canal */}
          {Object.keys(postsByChannel).length > 0 && (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '10px', 
              marginBottom: '20px' 
            }}>
              {Object.entries(postsByChannel).map(([channelName, stats]) => (
                <div key={channelName} style={{
                  padding: '12px',
                  background: 'white',
                  borderRadius: '8px',
                  border: '2px solid #e0e7ff'
                }}>
                  <strong style={{ display: 'block', marginBottom: '8px' }}>{channelName}</strong>
                  <div style={{ fontSize: '0.85em', color: '#666' }}>
                    Total: {stats.total} | 
                    <span style={{ color: '#ff9800' }}> ⏳ {stats.pending}</span> | 
                    <span style={{ color: '#4caf50' }}> ✅ {stats.sent}</span> | 
                    <span style={{ color: '#f44336' }}> ❌ {stats.failed}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lista de Postagens Agrupadas por Data */}
          {filteredPosts.length > 0 ? (
            <div className={styles.scheduledList}>
              {sortedDates.map((dateKey) => {
                const dateGroup = postsByDate[dateKey];
                
                return (
                  <div key={dateKey} style={{ marginBottom: '30px' }}>
                    <div style={{
                      padding: '12px 20px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '10px',
                      marginBottom: '15px',
                      fontWeight: '600',
                      fontSize: '1.1em',
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                    }}>
                      📅 {dateGroup.dayOfWeek} - {dateGroup.dateFormatted.split(',')[1]?.trim() || dateGroup.dateFormatted}
                      <span style={{ 
                        marginLeft: '15px', 
                        fontSize: '0.85em', 
                        opacity: 0.9,
                        fontWeight: 'normal'
                      }}>
                        ({dateGroup.posts.length} postagem{dateGroup.posts.length !== 1 ? 'ens' : ''})
                      </span>
                    </div>
                    
                    {dateGroup.posts
                      .map((post) => {
                        const performance = getPostPerformance(post);
                        return { post, performance };
                      })
                      .filter(({ post, performance }) => {
                        if (!showStats || statsFilter === 'all') return true;
                        if (!performance) return false;
                        
                        if (statsFilter === 'best') {
                          return performance.score > 5; // Ajuste o threshold conforme necessário
                        }
                        if (statsFilter === 'worst') {
                          return performance.score <= 2 && performance.score > 0;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        if (!showStats || statsFilter === 'all') return 0;
                        if (statsFilter === 'best') {
                          return (b.performance?.score || 0) - (a.performance?.score || 0);
                        }
                        if (statsFilter === 'worst') {
                          return (a.performance?.score || 0) - (b.performance?.score || 0);
                        }
                        return 0;
                      })
                      .map(({ post, performance }) => {
                        const statusBadge = getStatusBadge(post.status || 'pending');
                        const timeRemaining = getTimeRemaining(post.scheduledFor);
                        const channelName = channels.find(c => c.id === post.channelId)?.title || 
                                          post.channelTitle || 
                                          `Canal ${post.channelId}`;
                        
                        return (
                        <div key={post.id} className={styles.scheduledItem} style={{ marginBottom: '15px' }}>
                          <div className={styles.scheduledInfo}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                              <span style={{
                                padding: '4px 12px',
                                borderRadius: '12px',
                                background: statusBadge.color + '20',
                                color: statusBadge.color,
                                fontSize: '0.85em',
                                fontWeight: '600'
                              }}>
                                {statusBadge.text}
                              </span>
                              <strong style={{ color: '#667eea' }}>{channelName}</strong>
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <strong>🕐 Hora:</strong> {new Date(post.scheduledFor).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              <span style={{ 
                                marginLeft: '10px', 
                                color: '#666', 
                                fontSize: '0.9em' 
                              }}>
                                ({timeRemaining})
                              </span>
                            </div>
                            
                            <div style={{ marginBottom: '8px' }}>
                              <strong>💬 Mensagem:</strong>
                              <div style={{
                                marginTop: '5px',
                                padding: '10px',
                                background: '#f5f5f5',
                                borderRadius: '6px',
                                maxHeight: '100px',
                                overflow: 'auto',
                                fontSize: '0.9em',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word'
                              }}>
                                {post.message}
                              </div>
                            </div>
                            
                            {post.mediaUrl && (
                              <div style={{ marginTop: '8px', fontSize: '0.85em', color: '#666' }}>
                                📎 Mídia: 
                                {post.mediaUrl.startsWith('/api/telegram/media/') ? (
                                  <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', marginLeft: '5px' }}>
                                    Ver arquivo
                                  </a>
                                ) : (
                                  <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', marginLeft: '5px' }}>
                                    {post.mediaUrl}
                                  </a>
                                )}
                              </div>
                            )}
                            
                            {/* Estatísticas da Postagem */}
                            {showStats && performance && (
                              <div style={{ 
                                marginTop: '12px', 
                                padding: '12px', 
                                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                borderRadius: '8px',
                                border: '2px solid #667eea'
                              }}>
                                <strong style={{ display: 'block', marginBottom: '8px', color: '#333' }}>
                                  📊 Estatísticas de Desempenho
                                </strong>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
                                  gap: '10px',
                                  fontSize: '0.9em'
                                }}>
                                  <div>
                                    <strong>⭐ Score:</strong> {performance.score.toFixed(1)}
                                  </div>
                                  {performance.reactions > 0 && (
                                    <div>
                                      <strong>👍 Reações:</strong> {performance.reactions}
                                    </div>
                                  )}
                                  {performance.views > 0 && (
                                    <div>
                                      <strong>👁️ Visualizações:</strong> {performance.views.toLocaleString('pt-BR')}
                                    </div>
                                  )}
                                  {performance.forwards > 0 && (
                                    <div>
                                      <strong>📤 Encaminhamentos:</strong> {performance.forwards}
                                    </div>
                                  )}
                                </div>
                                {performance.stats.reactions && Object.keys(performance.stats.reactions).length > 0 && (
                                  <div style={{ marginTop: '8px', fontSize: '0.85em' }}>
                                    <strong>Reações detalhadas:</strong>
                                    <div style={{ marginTop: '4px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                      {Object.entries(performance.stats.reactions).map(([emoji, count]) => (
                                        <span key={emoji} style={{ 
                                          padding: '4px 8px', 
                                          background: 'white', 
                                          borderRadius: '4px',
                                          border: '1px solid #ddd'
                                        }}>
                                          {emoji} {count}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                <button
                                  onClick={() => loadMessageStats()}
                                  style={{
                                    marginTop: '8px',
                                    padding: '4px 12px',
                                    background: '#667eea',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.85em'
                                  }}
                                >
                                  🔄 Atualizar
                                </button>
                              </div>
                            )}
                          </div>
                          
                          <div className={styles.scheduledActions}>
                            {(post.status === 'pending' || !post.status) && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedPost({...post});
                                    setShowEditModal(true);
                                  }}
                                  className={styles.editBtn}
                                  title="Editar postagem"
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => handleSendNow(post.channelId, post.message, post.mediaUrl)}
                                  className={styles.sendNowBtn}
                                >
                                  📤 Enviar Agora
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => handleDeleteScheduled(post.id)}
                              className={styles.deleteBtn}
                            >
                              ❌ Cancelar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#666',
              background: 'white',
              borderRadius: '10px',
              border: '2px dashed #ddd'
            }}>
              {scheduledPosts.length === 0 
                ? 'Nenhuma postagem agendada ainda.' 
                : 'Nenhuma postagem encontrada com os filtros selecionados.'}
            </p>
          )}
        </div>
      )}

      {/* Modal de Edição */}
      {showEditModal && selectedPost && (
        <div className={styles.modalOverlay} onClick={() => setShowEditModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3>✏️ Editar Postagem Agendada</h3>
            <form onSubmit={handleEditPost}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Canal:</label>
              <select
                value={selectedPost.channelId}
                onChange={(e) => setSelectedPost({...selectedPost, channelId: e.target.value})}
                className={styles.formInput}
                style={{ marginBottom: '15px' }}
                disabled
              >
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title || channel.username || `Canal ${channel.id}`}
                  </option>
                ))}
              </select>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Mensagem:</label>
              <textarea
                value={selectedPost.message}
                onChange={(e) => setSelectedPost({...selectedPost, message: e.target.value})}
                rows={6}
                className={styles.formInput}
                style={{ marginBottom: '15px' }}
                required
              />

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>Data e Hora:</label>
              <div className={styles.dateTimeRow} style={{ marginBottom: '15px' }}>
                <input
                  type="date"
                  value={new Date(selectedPost.scheduledFor).toISOString().split('T')[0]}
                  onChange={(e) => {
                    const newDate = new Date(selectedPost.scheduledFor);
                    const [year, month, day] = e.target.value.split('-');
                    newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
                    setSelectedPost({...selectedPost, scheduledFor: newDate.toISOString()});
                  }}
                  className={styles.formInput}
                  required
                />
                <input
                  type="time"
                  value={new Date(selectedPost.scheduledFor).toTimeString().slice(0, 5)}
                  onChange={(e) => {
                    const newDate = new Date(selectedPost.scheduledFor);
                    const [hours, minutes] = e.target.value.split(':');
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    setSelectedPost({...selectedPost, scheduledFor: newDate.toISOString()});
                  }}
                  className={styles.formInput}
                  required
                />
              </div>

              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>URL da Mídia (opcional):</label>
              <input
                type="url"
                value={selectedPost.mediaUrl || ''}
                onChange={(e) => setSelectedPost({...selectedPost, mediaUrl: e.target.value})}
                className={styles.formInput}
                style={{ marginBottom: '15px' }}
                placeholder="URL da mídia (vídeo, imagem)"
              />

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" className={styles.scheduleBtn}>
                  💾 Salvar Alterações
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedPost(null);
                  }}
                  className={styles.deleteBtn}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
