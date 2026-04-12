const fs = require('fs');
const path = require('path');

const FILE_PATH = `g:\\Project Digitaux\\docling\\_legacy\\PDF Test\\BigMat 212017688 221021.pdf`;
const API_URL = 'http://localhost:8787/api/v1/scan';

async function runRealTest() {
    console.log("🚛 Chargement du fichier réel :", path.basename(FILE_PATH));
    
    try {
        if (!fs.existsSync(FILE_PATH)) {
            console.error("❌ Fichier introuvable à l'adresse spécifiée.");
            return;
        }

        const fileBuffer = fs.readFileSync(FILE_PATH);
        const blob = new Blob([fileBuffer], { type: 'application/pdf' });
        
        const formData = new FormData();
        formData.append('file', blob, path.basename(FILE_PATH));
        formData.append('latitude', '45.7600');
        formData.append('longitude', '4.8335');

        console.log("🚀 Envoi au moteur Docling V3...");
        const start = Date.now();
        
        const resp = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await resp.json();
        const duration = Date.now() - start;

        if (resp.ok) {
            console.log("✅ SUCCÈS ! Réponse en", duration, "ms");
            console.log("Invoice ID:", result.invoiceId);
            console.log("Status:", result.message);
            console.log("\nL'IA Gemini analyse actuellement le PDF en tâche de fond.");
        } else {
            console.error("❌ ERREUR API :", result.message);
        }
    } catch (e) {
        console.error("💥 ERREUR CRITIQUE :", e.message);
    }
}

runRealTest();
