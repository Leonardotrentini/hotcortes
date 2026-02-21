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
  const [activeTab, setActiveTab] = useState('cortes'); // 'cortes', 'telegram' ou 'mensagens'
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
    if (dragCounter.current === 0) {
      // Remove visual feedback
    }
  };

  const handleUpload = async () => {
    if (!videoFile) {
      alert('Por favor, selecione um vídeo primeiro');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('duration', selectedDuration);

    try {
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Upload: ${percentCompleted}%`);
        },
      });

      if (response.data.jobId) {
        setJobId(response.data.jobId);
        setUploading(false);
        
        // Iniciar processamento após upload (assíncrono)
        // Não aguardar resposta, pois o processamento pode demorar
        axios.post('/api/process', {
          jobId: response.data.jobId,
          duration: selectedDuration
        }).catch((processError) => {
          console.error('Erro ao iniciar processamento:', processError);
          // Não mostrar alerta aqui, pois o polling vai detectar o erro
        });
        
        // Iniciar polling imediatamente
        startProcessing(response.data.jobId);
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      setUploading(false);
      
      if (error.response?.status === 413) {
        alert('❌ Arquivo muito grande! O limite é 500MB. Por favor, comprima o vídeo antes de enviar.');
      } else if (error.response?.data?.error) {
        alert('❌ Erro: ' + error.response.data.error);
      } else {
        alert('❌ Erro ao fazer upload. Tente novamente.');
      }
    }
  };

  const startProcessing = async (id) => {
    setProcessing(true);
    setStatus({ status: 'processing', progress: 0, currentStep: 'Iniciando processamento...' });

    let attempts = 0;
    const maxAttempts = 300; // 10 minutos (300 * 2s)
    let lastError = null;

    const poll = setInterval(async () => {
      attempts++;
      try {
        const response = await axios.get(`/api/status?jobId=${id}`);
        setStatus(response.data);
        lastError = null; // Resetar erro se conseguir obter status

        if (response.data.status === 'completed' || attempts >= maxAttempts) {
          clearInterval(poll);
          setProcessing(false);
          if (attempts >= maxAttempts && response.data.status !== 'completed') {
            alert('⏰ Tempo limite excedido. O processamento pode estar demorando mais que o esperado.');
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
        lastError = error;
        
        // Se for erro 404, o job pode não ter sido criado ainda
        if (error.response?.status === 404 && attempts < 10) {
          // Aguardar mais um pouco antes de dar erro
          return;
        }
        
        // Se for erro 500 ou outro erro após várias tentativas, mostrar mensagem
        if (attempts > 5 && error.response?.status >= 500) {
          clearInterval(poll);
          setProcessing(false);
          alert('❌ Erro no servidor ao processar vídeo. Tente novamente ou verifique os logs.');
          return;
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(poll);
          setProcessing(false);
          if (lastError) {
            alert('❌ Erro ao verificar status do processamento: ' + (lastError.response?.data?.error || lastError.message));
          }
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
        <button
          className={`${styles.tab} ${activeTab === 'mensagens' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('mensagens')}
        >
          💬 Gerador de Mensagens
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

      {videoFile && (
        <div className={styles.durationSection}>
          <h2>2. Selecione a duração dos cortes</h2>
          <div className={styles.durationGrid}>
            {DURATIONS.map((duration) => (
              <button
                key={duration.value}
                className={`${styles.durationBtn} ${
                  selectedDuration === duration.value ? styles.activeDuration : ''
                }`}
                onClick={() => setSelectedDuration(duration.value)}
              >
                {duration.label}
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '30px' }}>
            <button
              className={styles.processBtn}
              onClick={handleUpload}
              disabled={uploading || processing}
            >
              {uploading ? '⏳ Enviando...' : processing ? '⏳ Processando...' : '🚀 Processar Vídeo'}
            </button>
          </div>
        </div>
      )}

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

      {/* Conteúdo da Aba de Gerador de Mensagens */}
      {activeTab === 'mensagens' && (
        <MessageGeneratorTab />
      )}
    </div>
  );
}

// Componente da Aba Gerador de Mensagens
function MessageGeneratorTab() {
  const [step, setStep] = useState(1); // 1: Estratégia, 2: Produtos, 3: Resultado
  const [strategy, setStrategy] = useState('');
  const [productInfo, setProductInfo] = useState({
    nome: '',
    preco: '',
    precoOriginal: '',
    desconto: '',
    caracteristicas: '',
    beneficios: '',
    publicoAlvo: '',
    objeccoes: '',
    garantia: '',
    urgencia: '',
    bonus: '',
  });
  const [generatedMessages, setGeneratedMessages] = useState([]);
  const [cadence, setCadence] = useState([]);

  const strategies = [
    { value: 'order-bump', label: '🎯 Order Bump', description: 'Oferta adicional no checkout' },
    { value: 'downsell', label: '📉 Downsell', description: 'Oferta de menor valor após recusa' },
    { value: 'upsell', label: '📈 Upsell', description: 'Oferta de maior valor após compra' },
    { value: 'cross-selling', label: '🔄 Cross-selling', description: 'Produtos complementares' },
  ];

  const generateMessages = () => {
    if (!strategy || !productInfo.nome) {
      alert('Por favor, preencha todos os campos obrigatórios!');
      return;
    }

    const messages = [];
    const cadenceData = [];

    // Mensagens baseadas na estratégia
    if (strategy === 'order-bump') {
      messages.push(...generateOrderBumpMessages());
      cadenceData.push(...generateOrderBumpCadence());
    } else if (strategy === 'downsell') {
      messages.push(...generateDownsellMessages());
      cadenceData.push(...generateDownsellCadence());
    } else if (strategy === 'upsell') {
      messages.push(...generateUpsellMessages());
      cadenceData.push(...generateUpsellCadence());
    } else if (strategy === 'cross-selling') {
      messages.push(...generateCrossSellingMessages());
      cadenceData.push(...generateCrossSellingCadence());
    }

    setGeneratedMessages(messages);
    setCadence(cadenceData);
    setStep(3);
  };

  const generateOrderBumpMessages = () => {
    const { nome, preco, desconto, beneficios, bonus } = productInfo;
    return [
      {
        type: 'Abertura',
        message: `🔥 ATENÇÃO! Você está prestes a perder uma oportunidade ÚNICA!\n\nEnquanto você finaliza sua compra, temos uma oferta ESPECIAL que só está disponível AGORA:\n\n✨ ${nome}\n\n💰 De R$ ${preco} por apenas R$ ${desconto || preco}\n\n${beneficios ? `🎁 ${beneficios}` : ''}\n\n⏰ Esta oferta expira em alguns minutos!`,
        timing: 'Imediato (no checkout)'
      },
      {
        type: 'Urgência',
        message: `⏰ ÚLTIMOS SEGUNDOS!\n\nVocê ainda está aqui? Perfeito! Ainda dá tempo de garantir:\n\n${nome}\n\n${bonus ? `🎁 BÔNUS EXCLUSIVO: ${bonus}` : ''}\n\n💰 Apenas R$ ${desconto || preco} - Esta é sua última chance!`,
        timing: '2 minutos após checkout'
      },
      {
        type: 'Fechamento',
        message: `💔 Sentimos muito, mas a oferta especial de ${nome} está prestes a expirar...\n\nMas ainda temos uma última chance para você:\n\n✅ ${nome}\n✅ ${beneficios || 'Benefícios exclusivos'}\n✅ ${bonus || 'Bônus especial'}\n\n💰 R$ ${desconto || preco} - Última oportunidade!`,
        timing: '5 minutos após checkout'
      }
    ];
  };

  const generateDownsellMessages = () => {
    const { nome, preco, precoOriginal, desconto, caracteristicas, beneficios } = productInfo;
    return [
      {
        type: 'Reconhecimento',
        message: `Olá! 👋\n\nEntendemos que R$ ${precoOriginal} pode ser um investimento significativo no momento.\n\nMas não queremos que você perca essa oportunidade! Por isso, preparamos algo ESPECIAL:\n\n🎯 ${nome}\n\n${caracteristicas ? `✨ ${caracteristicas}` : ''}\n\n💰 De R$ ${precoOriginal} por apenas R$ ${desconto || preco}\n\n${beneficios ? `🎁 ${beneficios}` : ''}\n\nEsta é uma oportunidade única!`,
        timing: 'Imediato (após recusa)'
      },
      {
        type: 'Valor',
        message: `💎 Você ainda está pensando?\n\nVamos ser diretos: ${nome} é uma oportunidade REAL de transformação.\n\n${beneficios || 'Benefícios exclusivos que você não encontrará em outro lugar.'}\n\n💰 Por apenas R$ ${desconto || preco} - Menos que um jantar fora!\n\nVale a pena? ABSOLUTAMENTE!`,
        timing: '1 hora após recusa'
      },
      {
        type: 'Última Chance',
        message: `⏰ ÚLTIMA CHANCE!\n\nEsta é realmente sua última oportunidade de garantir ${nome}.\n\n💰 R$ ${desconto || preco}\n\n${beneficios || 'Todos os benefícios que você precisa.'}\n\nNão deixe essa oportunidade passar. Esta oferta não voltará!`,
        timing: '24 horas após recusa'
      }
    ];
  };

  const generateUpsellMessages = () => {
    const { nome, preco, beneficios, bonus, garantia } = productInfo;
    return [
      {
        type: 'Parabéns',
        message: `🎉 PARABÉNS pela sua compra!\n\nVocê tomou uma decisão inteligente! E agora, temos algo AINDA MELHOR para você:\n\n🚀 ${nome}\n\n${beneficios ? `✨ ${beneficios}` : ''}\n\n${bonus ? `🎁 BÔNUS EXCLUSIVO: ${bonus}` : ''}\n\n💰 Apenas R$ ${preco}\n\n${garantia ? `✅ ${garantia}` : '✅ Garantia total'}\n\nQuer potencializar ainda mais seus resultados?`,
        timing: 'Imediato (após compra)'
      },
      {
        type: 'Oportunidade',
        message: `💎 Oportunidade Exclusiva!\n\nComo você já é nosso cliente, temos uma oferta ESPECIAL:\n\n${nome}\n\n${beneficios || 'Benefícios que complementam perfeitamente sua compra anterior.'}\n\n💰 R$ ${preco} - Apenas para clientes VIP!\n\nEsta oferta é limitada e exclusiva.`,
        timing: '2 horas após compra'
      },
      {
        type: 'Fechamento',
        message: `⏰ Últimas horas desta oferta especial!\n\n${nome} ainda está disponível para você:\n\n${beneficios || 'Todos os benefícios exclusivos'}\n\n💰 R$ ${preco}\n\n${garantia || 'Garantia total de satisfação'}\n\nNão perca esta última chance!`,
        timing: '48 horas após compra'
      }
    ];
  };

  const generateCrossSellingMessages = () => {
    const { nome, preco, caracteristicas, beneficios } = productInfo;
    return [
      {
        type: 'Recomendação',
        message: `💡 Recomendação Especial para Você!\n\nBaseado no que você já tem, recomendamos:\n\n🔄 ${nome}\n\n${caracteristicas ? `✨ ${caracteristicas}` : ''}\n\n${beneficios ? `🎁 ${beneficios}` : 'Perfeito para complementar sua experiência.'}\n\n💰 Apenas R$ ${preco}\n\nQuer potencializar ainda mais seus resultados?`,
        timing: 'Imediato (após compra)'
      },
      {
        type: 'Combo',
        message: `🎁 Oferta Combo Exclusiva!\n\nVocê já tem o produto principal. Que tal completar sua experiência?\n\n${nome}\n\n${beneficios || 'Ideal para usar junto com o que você já tem.'}\n\n💰 R$ ${preco}\n\nUse junto e veja a diferença!`,
        timing: '6 horas após compra'
      },
      {
        type: 'Lembrete',
        message: `💭 Lembrete Amigável!\n\nAinda está pensando em ${nome}?\n\n${beneficios || 'É a peça que falta para completar sua experiência.'}\n\n💰 R$ ${preco}\n\nVale muito a pena!`,
        timing: '72 horas após compra'
      }
    ];
  };

  const generateOrderBumpCadence = () => [
    { momento: 'Checkout', tempo: 'Imediato', acao: 'Exibir oferta no checkout' },
    { momento: 'Após 2 min', tempo: '2 minutos', acao: 'Enviar mensagem de urgência' },
    { momento: 'Após 5 min', tempo: '5 minutos', acao: 'Enviar última chance' },
  ];

  const generateDownsellCadence = () => [
    { momento: 'Recusa', tempo: 'Imediato', acao: 'Enviar oferta downsell' },
    { momento: 'Após 1h', tempo: '1 hora', acao: 'Enviar mensagem de valor' },
    { momento: 'Após 24h', tempo: '24 horas', acao: 'Enviar última chance' },
  ];

  const generateUpsellCadence = () => [
    { momento: 'Compra', tempo: 'Imediato', acao: 'Enviar parabéns + upsell' },
    { momento: 'Após 2h', tempo: '2 horas', acao: 'Enviar oferta exclusiva' },
    { momento: 'Após 48h', tempo: '48 horas', acao: 'Enviar fechamento' },
  ];

  const generateCrossSellingCadence = () => [
    { momento: 'Compra', tempo: 'Imediato', acao: 'Enviar recomendação' },
    { momento: 'Após 6h', tempo: '6 horas', acao: 'Enviar oferta combo' },
    { momento: 'Após 72h', tempo: '72 horas', acao: 'Enviar lembrete' },
  ];

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('✅ Mensagem copiada para a área de transferência!');
  };

  return (
    <div className={styles.messageGeneratorSection}>
      <h2>💬 Gerador de Mensagens de Vendas</h2>
      
      {step === 1 && (
        <div className={styles.strategySelection}>
          <h3>1. Selecione a Estratégia</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginTop: '20px' }}>
            {strategies.map((strat) => (
              <button
                key={strat.value}
                onClick={() => {
                  setStrategy(strat.value);
                  setStep(2);
                }}
                className={styles.strategyBtn}
                style={{
                  padding: '20px',
                  background: strategy === strat.value ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'white',
                  color: strategy === strat.value ? 'white' : '#333',
                  border: '2px solid #667eea',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.3s'
                }}
              >
                <div style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '5px' }}>
                  {strat.label}
                </div>
                <div style={{ fontSize: '0.9em', opacity: 0.9 }}>
                  {strat.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={styles.productForm}>
          <h3>2. Informações do Produto</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Preencha as informações abaixo para gerar mensagens personalizadas e assertivas
          </p>
          
          <form onSubmit={(e) => { e.preventDefault(); generateMessages(); }}>
            <div style={{ display: 'grid', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  value={productInfo.nome}
                  onChange={(e) => setProductInfo({...productInfo, nome: e.target.value})}
                  className={styles.formInput}
                  required
                  placeholder="Ex: Curso Completo de..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Preço Original (R$)
                  </label>
                  <input
                    type="text"
                    value={productInfo.precoOriginal}
                    onChange={(e) => setProductInfo({...productInfo, precoOriginal: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: 297"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Preço com Desconto (R$)
                  </label>
                  <input
                    type="text"
                    value={productInfo.preco}
                    onChange={(e) => setProductInfo({...productInfo, preco: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: 97"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    % de Desconto
                  </label>
                  <input
                    type="text"
                    value={productInfo.desconto}
                    onChange={(e) => setProductInfo({...productInfo, desconto: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: 67% OFF"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Características Principais
                </label>
                <textarea
                  value={productInfo.caracteristicas}
                  onChange={(e) => setProductInfo({...productInfo, caracteristicas: e.target.value})}
                  className={styles.formInput}
                  rows={3}
                  placeholder="Ex: Acesso vitalício, Suporte exclusivo, Conteúdo atualizado..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Benefícios (O que o cliente ganha)
                </label>
                <textarea
                  value={productInfo.beneficios}
                  onChange={(e) => setProductInfo({...productInfo, beneficios: e.target.value})}
                  className={styles.formInput}
                  rows={3}
                  placeholder="Ex: Transforme sua vida, Ganhe mais dinheiro, Tenha mais liberdade..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Público-Alvo
                </label>
                <input
                  type="text"
                  value={productInfo.publicoAlvo}
                  onChange={(e) => setProductInfo({...productInfo, publicoAlvo: e.target.value})}
                  className={styles.formInput}
                  placeholder="Ex: Pessoas que querem melhorar sua vida íntima..."
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                  Objeções Comuns (O que pode impedir a compra)
                </label>
                <textarea
                  value={productInfo.objeccoes}
                  onChange={(e) => setProductInfo({...productInfo, objeccoes: e.target.value})}
                  className={styles.formInput}
                  rows={2}
                  placeholder="Ex: Muito caro, Não tenho tempo, Já tentei antes..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Garantia
                  </label>
                  <input
                    type="text"
                    value={productInfo.garantia}
                    onChange={(e) => setProductInfo({...productInfo, garantia: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: 7 dias, 30 dias, Garantia total..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Urgência/Exclusividade
                  </label>
                  <input
                    type="text"
                    value={productInfo.urgencia}
                    onChange={(e) => setProductInfo({...productInfo, urgencia: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: Oferta por tempo limitado, Últimas vagas..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '600' }}>
                    Bônus/Extras
                  </label>
                  <input
                    type="text"
                    value={productInfo.bonus}
                    onChange={(e) => setProductInfo({...productInfo, bonus: e.target.value})}
                    className={styles.formInput}
                    placeholder="Ex: Bônus exclusivo, Material extra..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={styles.deleteBtn}
                >
                  ← Voltar
                </button>
                <button
                  type="submit"
                  className={styles.scheduleBtn}
                  style={{ flex: 1 }}
                >
                  🚀 Gerar Mensagens e Cadência
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className={styles.resultsSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>3. Mensagens Geradas</h3>
            <button
              onClick={() => {
                setStep(1);
                setGeneratedMessages([]);
                setCadence([]);
              }}
              className={styles.refreshBtn}
            >
              🔄 Gerar Novamente
            </button>
          </div>

          <div style={{ marginBottom: '30px' }}>
            <h4 style={{ marginBottom: '15px' }}>📅 Cadência de Envio</h4>
            <div style={{ background: 'white', padding: '15px', borderRadius: '10px', border: '2px solid #e0e7ff' }}>
              {cadence.map((item, index) => (
                <div key={index} style={{ 
                  padding: '10px', 
                  borderBottom: index < cadence.length - 1 ? '1px solid #eee' : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{item.momento}</strong>
                    <div style={{ fontSize: '0.85em', color: '#666' }}>{item.tempo}</div>
                  </div>
                  <div style={{ color: '#667eea', fontWeight: '600' }}>{item.acao}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 style={{ marginBottom: '15px' }}>💬 Mensagens</h4>
            {generatedMessages.map((msg, index) => (
              <div key={index} style={{
                background: 'white',
                padding: '20px',
                borderRadius: '10px',
                marginBottom: '15px',
                border: '2px solid #e0e7ff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <div>
                    <strong style={{ color: '#667eea' }}>{msg.type}</strong>
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px' }}>
                      ⏰ {msg.timing}
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(msg.message)}
                    className={styles.editBtn}
                    style={{ padding: '8px 16px' }}
                  >
                    📋 Copiar
                  </button>
                </div>
                <div style={{
                  background: '#f5f5f5',
                  padding: '15px',
                  borderRadius: '8px',
                  whiteSpace: 'pre-wrap',
                  lineHeight: '1.6',
                  fontSize: '0.95em'
                }}>
                  {msg.message}
                </div>
              </div>
            ))}
          </div>
        </div>
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
          {showManual ? '📖 Ocultar Manual' : '📖 Ver Manual de Configuração'}
        </button>
        {showManual && (
          <div className={styles.manualContent}>
            <h3>📚 Como Criar e Configurar seu Bot Telegram</h3>
            <ol>
              <li>
                <strong>1. Criar o Bot:</strong>
                <ul>
                  <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
                  <li>Envie o comando <code>/newbot</code></li>
                  <li>Siga as instruções para dar um nome e username ao seu bot</li>
                  <li>Copie o <strong>token</strong> fornecido pelo BotFather</li>
                </ul>
              </li>
              <li>
                <strong>2. Adicionar Bot ao Canal:</strong>
                <ul>
                  <li>Vá nas configurações do seu canal</li>
                  <li>Selecione "Administradores"</li>
                  <li>Adicione seu bot como administrador</li>
                  <li>Dê permissão para "Enviar mensagens"</li>
                </ul>
              </li>
              <li>
                <strong>3. Obter ID do Canal:</strong>
                <ul>
                  <li>Adicione o bot <strong>@userinfobot</strong> ao seu canal</li>
                  <li>Ou use o formato <code>-1001234567890</code> (número negativo)</li>
                  <li>O ID aparecerá nas informações do canal</li>
                </ul>
              </li>
              <li>
                <strong>4. Conectar:</strong>
                <ul>
                  <li>Cole o token do BotFather abaixo</li>
                  <li>Clique em "Conectar Bot"</li>
                  <li>Adicione os canais onde deseja postar</li>
                </ul>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Conexão do Bot */}
      {!isConnected ? (
        <div className={styles.connectSection}>
          <h3>🔌 Conectar Bot</h3>
          <div className={styles.connectForm}>
            <input
              type="text"
              placeholder="Cole o token do BotFather aqui..."
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className={styles.tokenInput}
            />
            <button
              onClick={handleConnect}
              className={styles.connectBtn}
              disabled={loading}
            >
              {loading ? '⏳ Conectando...' : '🔗 Conectar Bot'}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.connectedSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3>✅ Bot Conectado</h3>
              <p style={{ color: '#666', fontSize: '0.9em' }}>Token: {botToken}</p>
            </div>
            <button onClick={handleDisconnect} className={styles.disconnectBtn}>
              🔌 Desconectar
            </button>
          </div>

          {/* Canais */}
          <div className={styles.channelsSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3>📢 Canais</h3>
              <button
                onClick={() => setShowAddChannel(!showAddChannel)}
                className={styles.addChannelBtn}
              >
                {showAddChannel ? '❌ Cancelar' : '➕ Adicionar Canal'}
              </button>
            </div>

            {showAddChannel && (
              <form onSubmit={handleAddChannel} className={styles.addChannelForm}>
                <input
                  type="text"
                  placeholder="ID do Canal (ex: -1001234567890 ou @username)"
                  value={newChannel.id}
                  onChange={(e) => setNewChannel({...newChannel, id: e.target.value})}
                  className={styles.formInput}
                  required
                />
                <input
                  type="text"
                  placeholder="Nome do Canal (opcional)"
                  value={newChannel.title}
                  onChange={(e) => setNewChannel({...newChannel, title: e.target.value})}
                  className={styles.formInput}
                />
                <button type="submit" className={styles.scheduleBtn}>
                  ✅ Adicionar
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
