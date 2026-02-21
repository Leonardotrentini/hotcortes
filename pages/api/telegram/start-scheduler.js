// Endpoint para iniciar o agendador (chamado automaticamente)
import { startScheduler } from '../../../lib/telegramScheduler';

let schedulerStarted = false;

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    if (!schedulerStarted) {
      startScheduler();
      schedulerStarted = true;
      console.log('✅ Agendador iniciado via API');
    }

    res.status(200).json({
      success: true,
      message: 'Agendador está rodando',
      schedulerStarted: schedulerStarted,
    });
  } catch (error) {
    console.error('Erro ao iniciar agendador:', error);
    res.status(500).json({ 
      error: 'Erro ao iniciar agendador',
      details: error.message 
    });
  }
}
