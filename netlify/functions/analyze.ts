
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // 1. Manejo de CORS (Permitir llamadas desde el frontend)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    };
  }

  // 2. Validar método
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    // 3. Validar API Key
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("CRITICAL: API Key is missing in Netlify Environment Variables.");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server Error: API Key not configured." })
      };
    }

    // 4. Parsear el cuerpo de la solicitud de forma segura
    let bodyData;
    try {
      // A veces event.body ya es un objeto si se usa cierto middleware, o string si es raw
      bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      console.error("Error parsing request body:", e);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" })
      };
    }

    if (!bodyData || !bodyData.prompt) {
       return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'prompt' in request body" })
      };
    }

    const { prompt, systemInstruction, config } = bodyData;

    // 5. Llamada a Google Gemini
    const ai = new GoogleGenAI({ apiKey });
    
    // Usamos el modelo flash por defecto
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: config?.temperature || 0.2,
      }
    });

    // 6. Retorno exitoso
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({ text: response.text })
    };

  } catch (error: any) {
    console.error("FULL ERROR DETAILS:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "AI Service Error", 
        details: error.message || "Unknown error"
      })
    };
  }
};
