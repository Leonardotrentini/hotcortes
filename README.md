# CortesHot - Ferramenta de Corte de Vídeos

Ferramenta web para cortar vídeos automaticamente em durações específicas, otimizada para deploy na Vercel.

## 🚀 Funcionalidades

- ✅ Upload de vídeos (drag & drop ou seleção)
- ✅ 10 durações pré-definidas (15s até 15min)
- ✅ Processamento automático com FFmpeg
- ✅ Download em ZIP ou arquivos individuais
- ✅ Interface moderna e responsiva
- ✅ Monitoramento em tempo real do progresso

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Conta na Vercel (para deploy)

## 🛠️ Instalação Local

1. Clone ou baixe o projeto
2. Instale as dependências:
```bash
npm install
```

3. Execute em modo desenvolvimento:
```bash
npm run dev
```

4. Acesse `http://localhost:3000`

## 🚀 Deploy na Vercel

### Opção 1: Via CLI da Vercel

1. Instale a CLI da Vercel:
```bash
npm i -g vercel
```

2. Faça login:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

### Opção 2: Via GitHub

1. Faça push do código para um repositório GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe o repositório
4. A Vercel detectará automaticamente o Next.js e fará o deploy

## ⚙️ Configuração

### Variáveis de Ambiente

Não são necessárias variáveis de ambiente para funcionamento básico.

### Limites da Vercel

- **Timeout**: 300 segundos (5 minutos) para funções serverless
- **Tamanho máximo de arquivo**: 50MB (plano Hobby) ou 100MB (plano Pro)
- **Armazenamento**: Arquivos são temporários (ephemeral storage)

⚠️ **Nota Importante**: A Vercel usa armazenamento temporário. Arquivos são removidos após o processamento. Para armazenamento persistente, considere usar serviços como AWS S3, Cloudinary ou similar.

## 📁 Estrutura do Projeto

```
corteshot/
├── pages/
│   ├── api/
│   │   ├── upload.js      # Endpoint de upload
│   │   ├── process.js     # Endpoint de processamento
│   │   ├── status.js      # Endpoint de status
│   │   └── download.js    # Endpoint de download
│   ├── _app.js            # App wrapper
│   └── index.js           # Página principal
├── styles/
│   ├── globals.css        # Estilos globais
│   └── Home.module.css    # Estilos da home
├── package.json
├── vercel.json            # Configuração Vercel
└── next.config.js         # Configuração Next.js
```

## 🎬 Como Usar

1. **Upload**: Arraste um vídeo ou clique para selecionar
2. **Duração**: Escolha a duração dos cortes (15s a 15min)
3. **Processar**: Clique em "Processar Vídeo"
4. **Aguardar**: O sistema processará automaticamente
5. **Download**: Baixe o ZIP completo ou arquivos individuais

## 🔧 Tecnologias

- **Next.js 14**: Framework React
- **FFmpeg**: Processamento de vídeo
- **Archiver**: Criação de arquivos ZIP
- **Formidable**: Upload de arquivos

## 📝 Notas

- O processamento pode demorar dependendo do tamanho do vídeo
- Vídeos muito grandes podem exceder o timeout da Vercel
- Para vídeos grandes, considere usar um serviço de processamento externo

## 🐛 Troubleshooting

### Erro: "FFmpeg não encontrado"
- O `ffmpeg-static` deve ser instalado automaticamente
- Verifique se `node_modules/ffmpeg-static` existe

### Erro: "Timeout"
- Vídeos muito grandes podem exceder o limite de 5 minutos
- Considere processar vídeos menores ou usar um serviço dedicado

### Erro: "Arquivo muito grande"
- Limite de upload da Vercel: 50MB (Hobby) ou 100MB (Pro)
- Considere comprimir o vídeo antes do upload

## 📄 Licença

Este projeto é de uso pessoal.
