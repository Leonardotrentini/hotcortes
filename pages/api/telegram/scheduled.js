import { readFile, fileExists, listFiles } from '../../../lib/telegramStorage';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const files = listFiles('scheduled');
    const posts = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const postContent = readFile(`scheduled/${file}`);
          if (!postContent) {
            continue;
          }
          const postData = JSON.parse(postContent);
          
          // Adicionar informações do canal se disponível
          if (postData.channelId) {
            // Tentar obter nome do canal dos canais conhecidos
            if (fileExists('known_channels.json')) {
              try {
                const knownChannelsContent = readFile('known_channels.json');
                if (knownChannelsContent) {
                  const knownChannels = JSON.parse(knownChannelsContent);
                  const channel = knownChannels.find(c => c.id === postData.channelId || c.id === parseInt(postData.channelId));
                  if (channel) {
                    postData.channelTitle = channel.title || channel.username || `Canal ${postData.channelId}`;
                  } else {
                    postData.channelTitle = `Canal ${postData.channelId}`;
                  }
                } else {
                  postData.channelTitle = `Canal ${postData.channelId}`;
                }
              } catch (e) {
                postData.channelTitle = `Canal ${postData.channelId}`;
              }
            } else {
              postData.channelTitle = `Canal ${postData.channelId}`;
            }
          }

          posts.push(postData);
        } catch (error) {
          console.error(`Erro ao ler postagem ${file}:`, error);
        }
      }
    }

    // Ordenar por data agendada
    posts.sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));

    res.status(200).json({
      success: true,
      posts: posts,
    });
  } catch (error) {
    console.error('Erro ao listar postagens agendadas:', error);
    res.status(500).json({ 
      error: 'Erro ao listar postagens agendadas',
      details: error.message 
    });
  }
}
