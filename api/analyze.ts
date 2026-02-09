
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  // 1. Manejo de CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 2. Validar método
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // 3. Validar API Key
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: API Key is missing in Vercel Environment Variables.");
      return res.status(500).json({ error: "Configuration Error", details: "API Key not configured in server." });
    }

    // 4. Parsear el cuerpo de la solicitud
    // En Vercel (Node.js runtime), req.body suele venir ya parseado si el content-type es json
    const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!bodyData || !bodyData.prompt) {
       return res.status(400).json({ error: "Invalid Request", details: "Missing 'prompt' in request." });
    }

    const { prompt, systemInstruction, config } = bodyData;

    // 5. Llamada a Google Gemini
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: config?.temperature || 0.2,
      }
    });

    // 6. Retorno exitoso
    return res.status(200).json({ text: response.text });

  } catch (error: any) {
    console.error("FULL ERROR DETAILS:", error);
    return res.status(500).json({ 
      error: "AI Service Failed", 
      details: error.message || JSON.stringify(error)
    });
  }
}
