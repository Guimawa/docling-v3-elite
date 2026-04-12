import { GoogleGenerativeAI } from "@google/generative-ai";

export class AIService {
  private genAI: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async extractInvoiceData(imageBase64: string) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-lite" });
    
    const prompt = `Extraire les données de cette facture en JSON : 
    { "fournisseur": string, "total_ttc": number, "devise": string, "materiaux": [{ "nom": string, "prix_unitaire": number, "quantite": number, "unite": string }] }`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } }
    ]);

    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, ""));
  }

  async pilotAnalyze(query: string, context: any) {
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `Tu es le Pilot Docling. Contexte utilisateur : ${JSON.stringify(context)}. Question : ${query}`;
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
