# 🚀 Guia Completo de Deploy no Render

## ✅ Pré-requisitos

1. **Conta no GitHub** (já tem: https://github.com/Leonardotrentini/hotcortes)
2. **Conta no Render** (grátis): [render.com](https://render.com)

---

## 📋 Passo a Passo Completo

### 1️⃣ Criar Conta no Render

1. Acesse: https://render.com
2. Clique em **"Get Started for Free"**
3. Faça login com sua conta GitHub
4. Autorize o Render a acessar seus repositórios

---

### 2️⃣ Criar Novo Serviço Web

1. No dashboard do Render, clique em **"New +"**
2. Selecione **"Web Service"**
3. Conecte seu repositório GitHub:
   - Se não estiver conectado, clique em **"Connect GitHub"**
   - Autorize o acesso
   - Selecione o repositório: **`hotcortes`**

---

### 3️⃣ Configurar o Serviço

O Render detectará automaticamente o Next.js, mas verifique estas configurações:

#### Configurações Básicas:
- **Name**: `corteshot` (ou outro nome)
- **Region**: Escolha mais próximo (ex: `Oregon (US West)`)
- **Branch**: `main`
- **Root Directory**: Deixe vazio (ou `./`)

#### Build & Deploy:
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

#### Plan:
- **Plan**: `Free` (plano gratuito)

#### Environment Variables:
Clique em **"Advanced"** → **"Add Environment Variable"**:
- `NODE_ENV` = `production`
- `PORT` = `10000` (Render usa porta dinâmica, mas Next.js precisa saber)

---

### 4️⃣ Deploy

1. Clique em **"Create Web Service"**
2. O Render começará o build automaticamente
3. Aguarde 5-10 minutos para:
   - Instalar dependências
   - Fazer build do Next.js
   - Instalar FFmpeg (via ffmpeg-static)
   - Fazer deploy

---

### 5️⃣ Verificar Deploy

1. Você verá os logs do build em tempo real
2. Quando aparecer **"Your service is live"**, está pronto!
3. Sua URL será: `https://corteshot.onrender.com` (ou similar)

---

## ⚙️ Configurações Importantes

### Porta
O Render atribui uma porta dinâmica via variável `PORT`. O Next.js já está configurado para usar essa variável.

### FFmpeg
O `ffmpeg-static` será instalado automaticamente via npm. O Render suporta binários nativos, então funcionará normalmente.

### Armazenamento
- Arquivos temporários: `/tmp` (limpo após cada requisição)
- Para armazenamento persistente, considere usar S3 ou similar

---

## 🔄 Atualizações Futuras

Sempre que você fizer push para o GitHub:

```bash
git add .
git commit -m "Atualização"
git push
```

O Render fará deploy automático! 🎉

---

## ⚠️ Limitações do Plano Gratuito

| Item | Limite |
|------|--------|
| **Timeout** | Sem limite rígido (diferente da Vercel) |
| **Sleep** | Aplicação "dorme" após 15min de inatividade |
| **RAM** | 512MB |
| **CPU** | Compartilhado |
| **Bandwidth** | Ilimitado |

> 💡 **Nota**: A primeira requisição após "dormir" pode demorar ~30 segundos para "acordar".

---

## 🐛 Troubleshooting

### Erro: "Build Failed"
- Verifique os logs no Render
- Certifique-se de que `package.json` está correto
- Verifique se todas as dependências estão listadas

### Erro: "FFmpeg not found"
- O `ffmpeg-static` deve ser instalado automaticamente
- Verifique os logs do build
- Se não funcionar, podemos adicionar FFmpeg via buildpack

### Aplicação muito lenta
- Primeira requisição após "dormir" é lenta (normal)
- Considere upgrade para plano pago (não "dorme")

### Erro de porta
- Certifique-se de que `PORT` está configurado
- Next.js já está configurado para usar `PORT`

---

## ✅ Checklist de Deploy

- [ ] Conta Render criada
- [ ] Repositório GitHub conectado
- [ ] Serviço Web criado
- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído com sucesso
- [ ] Aplicação está "live"
- [ ] Testado em produção

---

## 🎯 Resultado Final

Depois do deploy, você terá:
- ✅ URL pública: `https://corteshot.onrender.com`
- ✅ HTTPS automático
- ✅ Deploy automático a cada `git push`
- ✅ FFmpeg funcionando normalmente
- ✅ Sem limitações de timeout rígidas

---

## 📞 Suporte

- **Documentação Render**: https://render.com/docs
- **Status**: https://status.render.com
- **Logs**: Dashboard → Seu Serviço → Logs

---

**Pronto! Agora é só seguir os passos acima e sua ferramenta estará online no Render! 🚀**
