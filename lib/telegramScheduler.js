import cron from 'node-cron';
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';
import path from 'path';

let schedulerRunning = false;
let scheduledTasks = {};

// Iniciar agendador
export function startScheduler() {
  if (schedulerRunning) {
    console.log('Agendador já está rodando');
    return;
  }

  schedulerRunning = true;
  console.log('🕐 Agendador de postagens Telegram iniciado');

  // Verificar postagens agendadas a cada minuto
  cron.schedule('* * * * *', async () => {
    try {
      await checkAndSendScheduledPosts();
    } catch (error) {
      console.error('Erro no agendador:', error);
    }
  });
}

// Verificar e enviar postagens agendadas
async function checkAndSendScheduledPosts() {
  const scheduledDir = path.join(process.cwd(), 'telegram_bots', 'scheduled');
  
  if (!fs.existsSync(scheduledDir)) {
    return;
  }

  const botDataPath = path.join(process.cwd(), 'telegram_bots', 'active_bot.json');
  if (!fs.existsSync(botDataPath)) {
    return; // Bot não conectado
  }

  const botData = JSON.parse(fs.readFileSync(botDataPath, 'utf8'));
  const bot = new TelegramBot(botData.token, { polling: false });

  const files = fs.readdirSync(scheduledDir);
  const now = new Date();

  for (const file of files) {
    if (file.endsWith('.json')) {
      try {
        const postPath = path.join(scheduledDir, file);
        const postData = JSON.parse(fs.readFileSync(postPath, 'utf8'));

        // Verificar se é hora de enviar
        const scheduledTime = new Date(postData.scheduledFor);
        const timeDiff = scheduledTime - now;

        // Enviar se estiver no intervalo de 1 minuto antes ou depois
        if (timeDiff >= -60000 && timeDiff <= 60000 && postData.status === 'pending') {
          console.log(`📤 Enviando postagem agendada: ${postData.id}`);

          try {
            const chatId = typeof postData.channelId === 'string' && postData.channelId.startsWith('@')
              ? postData.channelId
              : parseInt(postData.channelId);

            let sentMessage;

            if (postData.mediaUrl) {
              // Verificar se é arquivo local
              if (postData.mediaUrl.startsWith('/api/telegram/media/')) {
                const filename = postData.mediaUrl.split('/').pop();
                const mediaPath = path.join(process.cwd(), 'telegram_bots', 'media', filename);
                
                if (fs.existsSync(mediaPath)) {
                  const ext = path.extname(filename).toLowerCase();
                  if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                    sentMessage = await bot.sendPhoto(chatId, fs.createReadStream(mediaPath), { caption: postData.message });
                  } else if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
                    sentMessage = await bot.sendVideo(chatId, fs.createReadStream(mediaPath), { caption: postData.message });
                  } else {
                    sentMessage = await bot.sendDocument(chatId, fs.createReadStream(mediaPath), { caption: postData.message });
                  }
                } else {
                  throw new Error('Arquivo de mídia não encontrado');
                }
              } else {
                // URL externa
                if (postData.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                  sentMessage = await bot.sendPhoto(chatId, postData.mediaUrl, { caption: postData.message });
                } else if (postData.mediaUrl.match(/\.(mp4|avi|mov|mkv|webm)$/i)) {
                  sentMessage = await bot.sendVideo(chatId, postData.mediaUrl, { caption: postData.message });
                } else {
                  sentMessage = await bot.sendDocument(chatId, postData.mediaUrl, { caption: postData.message });
                }
              }
            } else {
              sentMessage = await bot.sendMessage(chatId, postData.message, { parse_mode: 'HTML' });
            }

            // Marcar como enviada
            postData.status = 'sent';
            postData.sentAt = new Date().toISOString();
            postData.messageId = sentMessage.message_id;
            fs.writeFileSync(postPath, JSON.stringify(postData, null, 2));

            // Salvar estatísticas iniciais da mensagem
            const statsPath = path.join(process.cwd(), 'telegram_bots', 'message_stats.json');
            let messageStats = {};
            
            if (fs.existsSync(statsPath)) {
              try {
                messageStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
              } catch (e) {
                messageStats = {};
              }
            }

            const messageKey = `${postData.channelId}_${sentMessage.message_id}`;
            messageStats[messageKey] = {
              messageId: sentMessage.message_id,
              channelId: postData.channelId,
              postId: postData.id,
              sentAt: new Date().toISOString(),
              views: null,
              reactions: {},
              forwards: 0,
              lastUpdated: new Date().toISOString(),
            };

            fs.writeFileSync(statsPath, JSON.stringify(messageStats, null, 2));

            console.log(`✅ Postagem ${postData.id} enviada com sucesso`);
          } catch (error) {
            console.error(`❌ Erro ao enviar postagem ${postData.id}:`, error);
            postData.status = 'failed';
            postData.error = error.message;
            fs.writeFileSync(postPath, JSON.stringify(postData, null, 2));
          }
        }
      } catch (error) {
        console.error(`Erro ao processar postagem ${file}:`, error);
      }
    }
  }
}

// Parar agendador
export function stopScheduler() {
  schedulerRunning = false;
  console.log('🛑 Agendador de postagens Telegram parado');
}
