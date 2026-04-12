/**
 * DOCLING V3 - LOAD TESTER
 * Simule une montée en charge massive sur l'API
 */
const CONCURRENT_USERS = 50;
const SCANS_PER_USER = 5;
const API_URL = 'http://localhost:8787/api/v1/scan';

async function simulateScan(userId, scanId) {
    const start = Date.now();
    try {
        // Envoi d'un faux fichier (Blob)
        const formData = new FormData();
        const fakeFile = new Blob(['fake image content'], { type: 'image/jpeg' });
        formData.append('file', fakeFile, `stress_test_${userId}_${scanId}.jpg`);
        formData.append('latitude', '45.76');
        formData.append('longitude', '4.83');

        const resp = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });

        const data = await resp.json();
        const duration = Date.now() - start;
        
        if (resp.ok) {
            console.log(`[User ${userId}] Scan ${scanId} Success in ${duration}ms (Status: ${data.message})`);
            return { success: true, duration };
        } else {
            console.error(`[User ${userId}] Scan ${scanId} Failed: ${data.message}`);
            return { success: false, duration };
        }
    } catch (e) {
        console.error(`[User ${userId}] Error:`, e.message);
        return { success: false, duration: Date.now() - start };
    }
}

async function runLoadTest() {
    console.log(`🚀 Lancement du Crash Test : ${CONCURRENT_USERS} utilisateurs, ${SCANS_PER_USER} scans chacun.`);
    const startTime = Date.now();
    const tasks = [];

    for (let u = 0; u < CONCURRENT_USERS; u++) {
        for (let s = 0; s < SCANS_PER_USER; s++) {
            tasks.push(simulateScan(u, s));
        }
    }

    const results = await Promise.all(tasks);
    const totalTime = Date.now() - startTime;
    
    const successes = results.filter(r => r.success).length;
    const avgTime = results.reduce((acc, r) => acc + r.duration, 0) / results.length;

    console.log(`\n--- 📊 BILAN MONTÉE EN CHARGE ---`);
    console.log(`Total Requêtes : ${results.length}`);
    console.log(`Succès : ${successes}`);
    console.log(`Échecs : ${results.length - successes}`);
    console.log(`Temps Total : ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`Temps Moyen / Scan : ${avgTime.toFixed(0)}ms`);
    console.log(`---------------------------------`);
}

runLoadTest();
