# 🚀 Guia de Deploy - CortesHot

## Deploy na Vercel (Recomendado)

### Pré-requisitos
- Conta na Vercel (gratuita): [vercel.com](https://vercel.com)
- Código no GitHub (opcional, mas recomendado)

### Método 1: Deploy via GitHub (Mais Fácil)

1. **Criar repositório no GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/SEU_USUARIO/corteshot.git
   git push -u origin main
   ```

2. **Conectar na Vercel**
   - Acesse [vercel.com](https://vercel.com)
   - Clique em "Add New Project"
   - Importe o repositório do GitHub
   - A Vercel detectará automaticamente o Next.js

3. **Configurações (opcional)**
   - Framework Preset: Next.js (detectado automaticamente)
   - Build Command: `npm run build` (padrão)
   - Output Directory: `.next` (padrão)
   - Install Command: `npm install` (padrão)

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (2-5 minutos)
   - Pronto! Sua aplicação estará online

### Método 2: Deploy via CLI

1. **Instalar Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```
   
   Siga as instruções:
   - Link to existing project? **N**
   - Project name? **corteshot** (ou outro nome)
   - Directory? **./** (pressione Enter)
   - Override settings? **N**

4. **Deploy de Produção**
   ```bash
   vercel --prod
   ```

## ⚙️ Configurações Importantes

### Timeout das Funções
O `vercel.json` já está configurado com timeout de 300 segundos (5 minutos) para as API routes.

### Limites da Vercel

| Plano | Timeout | Tamanho Máximo | Armazenamento |
|-------|---------|----------------|---------------|
| Hobby (Grátis) | 10s (API) / 300s (Pro) | 50MB | Temporário (/tmp) |
| Pro | 60s (API) / 300s (Pro) | 100MB | Temporário (/tmp) |

⚠️ **Importante**: 
- Arquivos são armazenados em `/tmp` (temporário)
- Arquivos são removidos após o processamento
- Para armazenamento persistente, use S3, Cloudinary, etc.

## 🔧 Variáveis de Ambiente

Não são necessárias variáveis de ambiente para funcionamento básico.

Se precisar configurar algo específico:
1. Acesse o projeto na Vercel
2. Vá em Settings > Environment Variables
3. Adicione as variáveis necessárias

## 📝 Checklist de Deploy

- [ ] Código commitado no Git
- [ ] `package.json` com todas as dependências
- [ ] `vercel.json` configurado
- [ ] `next.config.js` configurado
- [ ] Testado localmente (`npm run dev`)
- [ ] Deploy realizado
- [ ] Testado em produção

## 🐛 Troubleshooting

### Erro: "Module not found"
- Verifique se todas as dependências estão no `package.json`
- Execute `npm install` localmente para testar

### Erro: "Function timeout"
- Vídeos muito grandes podem exceder o timeout
- Considere processar vídeos menores
- Ou use um serviço de processamento externo

### Erro: "File too large"
- Limite de upload: 50MB (Hobby) ou 100MB (Pro)
- Comprima o vídeo antes do upload
- Ou use um serviço de armazenamento externo

### Erro: "FFmpeg not found"
- O `ffmpeg-static` deve ser instalado automaticamente
- Verifique se está no `package.json`
- A Vercel instala automaticamente no build

## 🔄 Atualizações

Para atualizar o deploy:
```bash
git add .
git commit -m "Atualização"
git push
```
A Vercel fará deploy automático se estiver conectada ao GitHub.

Ou manualmente:
```bash
vercel --prod
```

## 📊 Monitoramento

- Acesse o dashboard da Vercel para ver:
  - Logs de build
  - Logs de runtime
  - Métricas de performance
  - Erros e exceções

## ✅ Pronto!

Sua aplicação estará disponível em:
`https://seu-projeto.vercel.app`
