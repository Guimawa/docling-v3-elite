/**
 * DOCLING V3 - SMOKE TEST (ARCHITECTURE 2026)
 * Valide le flux : Envoi -> Capture -> Background Check
 */
const API_URL = 'http://localhost:8787/api/v1/scan';

async function testScanFlow() {
    console.log("🧪 Démarrage du Smoke Test...");
    
    try {
        const formData = new FormData();
        // Simulation d'une facture Bosch
        const fakeFile = new Blob(['fake invoice content'], { type: 'image/jpeg' });
        formData.append('file', fakeFile, 'facture_bosch_test_001.jpg');
        formData.append('latitude', '45.76');
        formData.append('longitude', '4.83');

        console.log("📤 Envoi de la facture au Worker...");
        const start = Date.now();
        const resp = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const result = await resp.json();
        
        if (resp.ok) {
            console.log("✅ RÉPONSE ÉCLAIR REÇUE !");
            console.log(`⏱️ Latence : ${Date.now() - start}ms`);
            console.log(`🆔 ID Facture : ${result.invoiceId}`);
            console.log(`📝 Message : ${result.message}`);
            
            console.log("\n🚀 L'analyse Gemini tourne maintenant en arrière-plan sur l'Edge.");
            console.log("Vérifiez votre Dashboard Sophie pour voir l'extraction apparaître.");
        } else {
            console.error("❌ ÉCHEC DU TEST :", result.message);
        }
    } catch (e) {
        console.error("❌ ERREUR CONNEXION (Le worker est-il lancé ?) :", e.message);
    }
}

testScanFlow();
