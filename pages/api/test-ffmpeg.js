import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const info = {
      ffmpegStatic: ffmpegStatic || 'Não encontrado',
      ffmpegExists: ffmpegStatic ? fs.existsSync(ffmpegStatic) : false,
      vercel: !!process.env.VERCEL,
      render: !!process.env.RENDER,
      nodeEnv: process.env.NODE_ENV,
      tmpDir: (process.env.VERCEL || process.env.RENDER) ? '/tmp' : path.join(process.cwd(), 'uploads'),
      canWriteTmp: false,
      ffmpegVersion: null,
    };

    // Testar escrita em /tmp
    try {
      const testFile = path.join(info.tmpDir, 'test-' + Date.now() + '.txt');
      fs.writeFileSync(testFile, 'test');
      info.canWriteTmp = true;
      fs.unlinkSync(testFile);
    } catch (e) {
      info.canWriteTmp = false;
      info.tmpError = e.message;
    }

    // Tentar obter versão do FFmpeg
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) {
      try {
        ffmpeg.setFfmpegPath(ffmpegStatic);
        // Não podemos executar diretamente, mas podemos verificar se o caminho está correto
        info.ffmpegConfigured = true;
      } catch (e) {
        info.ffmpegConfigured = false;
        info.ffmpegError = e.message;
      }
    }

    res.status(200).json({
      success: true,
      info,
      message: 'Informações de diagnóstico do FFmpeg',
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
