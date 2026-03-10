const fs = require('fs');
const path = require('path');

// Limpar arquivos grandes antes do build
function cleanLargeFiles() {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  if (fs.existsSync(uploadsDir)) {
    console.log('🧹 Limpando arquivos grandes da pasta uploads/...');
    
    try {
      // Remover apenas arquivos de vídeo e outputs grandes
      const outputsDir = path.join(uploadsDir, 'outputs');
      if (fs.existsSync(outputsDir)) {
        const dirs = fs.readdirSync(outputsDir);
        dirs.forEach(dir => {
          const dirPath = path.join(outputsDir, dir);
          if (fs.statSync(dirPath).isDirectory()) {
            // Remover apenas arquivos .mp4 e .zip grandes
            const files = fs.readdirSync(dirPath);
            files.forEach(file => {
              const filePath = path.join(dirPath, file);
              if (file.endsWith('.mp4') || file.endsWith('.zip')) {
                const stats = fs.statSync(filePath);
                if (stats.size > 10 * 1024 * 1024) { // > 10MB
                  console.log(`  Removendo: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
                  fs.unlinkSync(filePath);
                }
              }
            });
          }
        });
      }
      
      // Remover arquivos de upload grandes
      const uploadsFilesDir = path.join(uploadsDir, 'uploads');
      if (fs.existsSync(uploadsFilesDir)) {
        const files = fs.readdirSync(uploadsFilesDir);
        files.forEach(file => {
          const filePath = path.join(uploadsFilesDir, file);
          if (file.endsWith('.mp4')) {
            const stats = fs.statSync(filePath);
            if (stats.size > 10 * 1024 * 1024) { // > 10MB
              console.log(`  Removendo: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
              fs.unlinkSync(filePath);
            }
          }
        });
      }
      
      console.log('✅ Limpeza concluída!');
    } catch (error) {
      console.warn('⚠️  Aviso ao limpar arquivos:', error.message);
      // Não falhar o build se houver erro na limpeza
    }
  }
}

// Executar apenas em produção/Vercel
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  cleanLargeFiles();
}
