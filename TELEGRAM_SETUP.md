# 📱 Guia de Configuração - Telegram Bot

## ✅ Sistema Implementado

A integração com Telegram Bot foi implementada com sucesso! Agora você pode:

1. **Conectar seu bot do Telegram**
2. **Listar canais onde o bot está**
3. **Enviar mensagens imediatas**
4. **Agendar postagens para o futuro**

---

## 🚀 Como Usar

### 1. Criar o Bot no Telegram

1. Abra o Telegram e procure por **@BotFather**
2. Inicie uma conversa e envie: `/newbot`
3. Escolha um nome para seu bot (ex: "Meu Bot de Postagens")
4. Escolha um username único (deve terminar com "bot", ex: "meubot_postagens_bot")
5. O BotFather retornará um **TOKEN** - copie e guarde!

**⚠️ Importante:** Nunca compartilhe seu token com ninguém!

### 2. Adicionar o Bot aos Canais

1. Vá até o canal onde deseja postar
2. Clique em **Administradores** → **Adicionar Administrador**
3. Procure pelo username do seu bot (ex: @meubot_postagens_bot)
4. Dê permissão de **"Postar Mensagens"**
5. Opcional: Dê outras permissões se necessário

**💡 Dica:** O bot precisa ser administrador do canal para postar!

### 3. Obter o ID do Canal

**Opção 1 - Canal Público:**
- Use o formato: `@nome_do_canal` (ex: @meucanal)

**Opção 2 - Canal Privado:**
- Adicione o bot `@userinfobot` ao canal
- O ID será mostrado automaticamente quando você conectar o bot

### 4. Conectar o Bot na Aplicação

1. Acesse a aba **"📱 Telegram Bot"** na aplicação
2. Clique em **"📖 Ver Manual"** se precisar de ajuda
3. Cole o token do BotFather no campo
4. Clique em **"🔗 Conectar Bot"**
5. Se conectado, os canais aparecerão automaticamente

---

## 📋 Funcionalidades Disponíveis

### ✅ Enviar Mensagem Imediata

1. Selecione o canal
2. Digite a mensagem
3. (Opcional) Adicione URL de mídia (imagem/vídeo)
4. Clique em **"📤 Enviar Agora"** (nas postagens agendadas)

### ✅ Agendar Postagem

1. Preencha o formulário:
   - **Canal:** Selecione o canal
   - **Mensagem:** Digite a mensagem
   - **Data:** Selecione a data
   - **Hora:** Selecione a hora
   - **Mídia (Opcional):** URL de imagem/vídeo
2. Clique em **"📅 Agendar Postagem"**
3. A postagem será enviada automaticamente no horário agendado

### ✅ Gerenciar Postagens Agendadas

- **Ver todas:** Lista todas as postagens agendadas
- **Enviar agora:** Enviar uma postagem agendada imediatamente
- **Cancelar:** Remover uma postagem agendada

---

## 🔧 Endpoints da API

### `POST /api/telegram/connect`
Conecta o bot usando o token

### `GET /api/telegram/status`
Verifica se há bot conectado

### `GET /api/telegram/channels`
Lista canais onde o bot está

### `POST /api/telegram/send`
Envia mensagem imediata

### `POST /api/telegram/schedule`
Agenda uma postagem

### `GET /api/telegram/scheduled`
Lista postagens agendadas

### `DELETE /api/telegram/scheduled/[id]`
Cancela uma postagem agendada

### `POST /api/telegram/disconnect`
Desconecta o bot

---

## ⚙️ Sistema de Agendamento

O sistema usa `node-cron` para verificar postagens agendadas a cada minuto. Quando uma postagem está no horário, ela é enviada automaticamente.

**Status das postagens:**
- `pending` - Aguardando envio
- `sent` - Enviada com sucesso
- `failed` - Falha no envio

---

## 📝 Notas Importantes

1. **Segurança:** Tokens são armazenados localmente em `telegram_bots/active_bot.json`
2. **Limitações:** A API do Telegram não permite listar todos os canais automaticamente
3. **Canais:** Você precisa adicionar o bot aos canais manualmente
4. **Permissões:** O bot precisa ser administrador do canal para postar

---

## 🐛 Troubleshooting

### Bot não conecta
- Verifique se o token está correto
- Certifique-se de que copiou o token completo do BotFather

### Não consigo ver canais
- Adicione o bot aos canais primeiro
- Use o formato `@nome_do_canal` para canais públicos
- Para canais privados, forneça o ID do canal

### Mensagem não é enviada
- Verifique se o bot é administrador do canal
- Certifique-se de que o bot tem permissão para "Postar Mensagens"
- Verifique se o ID do canal está correto

### Postagem agendada não é enviada
- Verifique se o agendador está rodando (inicia automaticamente ao conectar)
- Verifique os logs do servidor
- Certifique-se de que a data/hora está no futuro

---

## ✅ Pronto para Usar!

O sistema está funcionando e pronto para testes locais. Após testar, você pode fazer deploy normalmente.
