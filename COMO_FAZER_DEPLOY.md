# 🚀 Como Fazer Deploy na Vercel - Guia Simples

## ✅ Pré-requisitos

1. **Conta no GitHub** (grátis): [github.com](https://github.com)
2. **Conta na Vercel** (grátis): [vercel.com](https://vercel.com)

---

## 📋 Passo a Passo (5 minutos)

### 1️⃣ Preparar o Código no GitHub

**Opção A: Se você já tem Git configurado**
```bash
cd "C:\Users\Leonardo trentini\Desktop\ferramentahot"
git init
git add .
git commit -m "Primeiro commit - CortesHot"
```

**Opção B: Criar repositório no GitHub primeiro**
1. Acesse [github.com/new](https://github.com/new)
2. Nome: `corteshot` (ou outro nome)
3. Marque **"Public"** ou **"Private"**
4. **NÃO** marque "Add README" (já temos)
5. Clique em **"Create repository"**

**Depois, no terminal:**
```bash
cd "C:\Users\Leonardo trentini\Desktop\ferramentahot"
git init
git add .
git commit -m "Primeiro commit - CortesHot"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/corteshot.git
git push -u origin main
```

> ⚠️ **Substitua `SEU_USUARIO` pelo seu nome de usuário do GitHub**

---

### 2️⃣ Fazer Deploy na Vercel

1. **Acesse [vercel.com](https://vercel.com)**
2. Clique em **"Sign Up"** ou **"Log In"**
3. Escolha **"Continue with GitHub"**
4. Autorize a Vercel a acessar seus repositórios

5. **Na dashboard da Vercel:**
   - Clique em **"Add New Project"** ou **"Import Project"**
   - Selecione o repositório `corteshot`
   - Clique em **"Import"**

6. **Configurações do Projeto:**
   - **Framework Preset:** Next.js (já detectado automaticamente ✅)
   - **Root Directory:** `./` (deixe padrão)
   - **Build Command:** `npm run build` (já está correto ✅)
   - **Output Directory:** `.next` (já está correto ✅)
   - **Install Command:** `npm install` (já está correto ✅)

7. **Clique em "Deploy"** 🚀

8. **Aguarde 2-5 minutos** enquanto a Vercel:
   - Instala dependências
   - Faz build do projeto
   - Faz deploy

9. **Pronto!** 🎉
   - Você verá: **"Congratulations! Your project has been deployed"**
   - Sua URL será: `https://corteshot.vercel.app` (ou similar)

---

## ⚙️ Configurações Importantes (Já Feitas)

✅ **Timeout:** 300 segundos (5 minutos) - configurado no `vercel.json`
✅ **Next.js:** Detectado automaticamente
✅ **FFmpeg:** Instalado via `ffmpeg-static`
✅ **Arquivos temporários:** Usa `/tmp` (compatível com Vercel)

---

## 🔄 Atualizar o Deploy (Quando Fizer Mudanças)

Sempre que você modificar o código:

```bash
cd "C:\Users\Leonardo trentini\Desktop\ferramentahot"
git add .
git commit -m "Descrição da mudança"
git push
```

A Vercel **automaticamente** fará um novo deploy! 🎉

---

## ⚠️ Limites da Vercel (Plano Grátis)

| Item | Limite |
|------|--------|
| **Timeout** | 300 segundos (5 min) |
| **Tamanho de Upload** | 50MB |
| **Armazenamento** | Temporário (`/tmp`) |
| **Bandwidth** | 100GB/mês |

> 💡 **Dica:** Para vídeos maiores que 50MB, considere comprimir antes ou usar um serviço de armazenamento externo.

---

## 🐛 Problemas Comuns

### ❌ Erro: "Build Failed"
- **Solução:** Verifique os logs na Vercel
- Geralmente é problema de dependências
- Tente: `npm install` localmente primeiro

### ❌ Erro: "Function Timeout"
- **Solução:** Vídeo muito grande ou processamento muito lento
- Tente com vídeos menores primeiro
- Ou considere upgrade para plano Pro (60s timeout)

### ❌ Erro: "File too large"
- **Solução:** Limite de 50MB no plano grátis
- Comprima o vídeo antes do upload
- Ou faça upgrade para Pro (100MB)

---

## ✅ Checklist Antes do Deploy

- [ ] Código commitado no Git
- [ ] Repositório criado no GitHub
- [ ] Código enviado para GitHub (`git push`)
- [ ] Conta Vercel criada
- [ ] Projeto importado na Vercel
- [ ] Deploy realizado com sucesso
- [ ] Testado em produção

---

## 🎯 Resultado Final

Depois do deploy, você terá:
- ✅ URL pública: `https://seu-projeto.vercel.app`
- ✅ HTTPS automático
- ✅ Deploy automático a cada `git push`
- ✅ Logs e monitoramento
- ✅ Sem necessidade de servidor próprio

---

## 📞 Precisa de Ajuda?

1. **Logs da Vercel:** Dashboard > Seu Projeto > Deployments > Logs
2. **Documentação:** [vercel.com/docs](https://vercel.com/docs)
3. **Status:** [vercel-status.com](https://www.vercel-status.com)

---

**Pronto! Agora é só seguir os passos acima e sua ferramenta estará online! 🚀**
