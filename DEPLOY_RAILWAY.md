# 🚂 Guia de Deploy no Railway

## ✅ Tudo Configurado!

O projeto está **100% adaptado** para Railway. Basta seguir os passos abaixo.

---

## 📋 Passo a Passo

### 1. **No Dashboard do Railway**

1. Acesse: https://railway.app
2. Faça login na sua conta
3. Você já conectou o repositório GitHub ✅

### 2. **Criar Novo Projeto**

1. Clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Escolha o repositório: `hotcortes`
4. Railway detectará automaticamente que é um projeto Next.js

### 3. **Configurações Automáticas**

O Railway detectará automaticamente:
- ✅ **Build Command**: `npm install && npm run build`
- ✅ **Start Command**: `npm start` (definido no Procfile)
- ✅ **Port**: Usará a variável `PORT` automaticamente

### 4. **Variáveis de Ambiente (Opcional)**

Railway não precisa de variáveis especiais, mas você pode adicionar:

1. Vá em **Settings** → **Variables**
2. Adicione (se necessário):
   - `NODE_ENV` = `production`
   - `PORT` = `3000` (Railway define automaticamente, mas pode forçar)

### 5. **Deploy**

1. Railway fará deploy **automaticamente** após conectar o repositório
2. Aguarde 3-5 minutos para o build completar
3. Quando aparecer **"Deployed"**, está pronto! 🎉

### 6. **Acessar Aplicação**

1. Vá em **Settings** → **Domains**
2. Railway fornece um domínio gratuito: `seu-projeto.up.railway.app`
3. Ou configure um domínio customizado

---

## 🎯 Vantagens do Railway

✅ **FFmpeg funciona perfeitamente** (servidor real, não serverless)
✅ **Sem limite de timeout** (diferente do Vercel)
✅ **Até 500MB de upload** (muito mais que Vercel)
✅ **Deploy automático** a cada push no GitHub
✅ **HTTPS automático**
✅ **Logs em tempo real**
✅ **Plano gratuito generoso**

---

## 🔧 Configurações Técnicas

### Arquivos Criados:

- ✅ `Procfile` - Define comando de start
- ✅ `railway.json` - Configuração do Railway
- ✅ `.gitignore` - Ignora arquivos desnecessários

### Ajustes no Código:

- ✅ Removidas referências a Vercel/Render
- ✅ Usa diretório normal (não `/tmp`)
- ✅ Limite aumentado para 500MB
- ✅ FFmpeg configurado para Railway
- ✅ Detecção automática de ambiente

---

## 📊 Limites do Plano Gratuito

- **500MB de upload** por requisição
- **512MB de RAM**
- **$5 de crédito grátis** por mês
- **Sem limite de timeout** (diferente do Vercel)

---

## 🐛 Troubleshooting

### Se o deploy falhar:

1. **Verifique os logs**:
   - Vá em **Deployments** → Clique no último deploy → **View Logs**

2. **Erro de FFmpeg**:
   - Railway instala automaticamente via `ffmpeg-static`
   - Se der erro, verifique os logs

3. **Erro de porta**:
   - Railway define `PORT` automaticamente
   - O código já está configurado para usar `${PORT:-3000}`

4. **Erro de memória**:
   - Se vídeos muito grandes derem erro, considere upgrade
   - Ou processe vídeos menores

---

## ✅ Pronto!

Tudo está configurado. Basta fazer o deploy no Railway e testar! 🚀

**O código já está no GitHub e pronto para deploy automático.**
