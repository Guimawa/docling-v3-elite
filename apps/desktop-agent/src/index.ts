import notifier from 'node-notifier';

// ... (imports et init restants identiques)

watcher.on('add', async (filePath) => {
  const fileName = path.basename(filePath);
  if (!fileName.toLowerCase().endsWith('.pdf') && !fileName.toLowerCase().endsWith('.jpg')) return;

  log(`🚀 Traitement de : ${fileName}`);

  let attempts = 0;
  const maxRetries = 3;

  const processFile = async () => {
    try {
      const fileHash = calculateHash(filePath);
      if (processedHashes.has(fileHash)) {
        log(`⚠️ Doublon local : ${fileName}`);
        archiveFile(filePath, true);
        return;
      }

      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));
      formData.append('source', 'desktop_watchdog');

      const response = await axios.post(API_URL, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${API_TOKEN}`
        },
        timeout: 30000 // 30s timeout pour Gemini
      });

      if (response.status === 200 || response.status === 201) {
        log(`✅ Succès : ${fileName}`);
        processedHashes.add(fileHash);
        archiveFile(filePath, true);
        notifier.notify({
          title: 'Docling Pronto',
          message: `Facture ${fileName} synchronisée avec succès !`,
          sound: true
        });
      }
    } catch (error: any) {
      if (error.response?.status === 409) {
        log(`⚠️ Doublon API : ${fileName}`);
        archiveFile(filePath, true);
      } else if (attempts < maxRetries) {
        attempts++;
        log(`🔄 Échec (Tentative ${attempts}/${maxRetries}) pour ${fileName}. Nouvel essai dans 5s...`);
        setTimeout(processFile, 5000);
      } else {
        log(`❌ Abandon après ${maxRetries} échecs : ${fileName}`);
        archiveFile(filePath, false);
        notifier.notify({
          title: 'Docling Erreur',
          message: `Échec de synchro pour ${fileName}.`,
          wait: true
        });
      }
    }
  };

  processFile();
});

function archiveFile(filePath: string, success: boolean) {
  const targetDir = success ? processedDir : errorDir;
  const fileName = path.basename(filePath);
  const destPath = path.join(targetDir, fileName);
  
  try {
    fs.renameSync(filePath, destPath);
  } catch (e) {
    // Si déjà présent, on ajoute un suffixe
    fs.renameSync(filePath, path.join(targetDir, `${Date.now()}_${fileName}`));
  }
}
