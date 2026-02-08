
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // 1. Manejo de CORS
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
        body: JSON.stringify({ error: "Configuration Error", details: "API Key not configured in server." })
      };
    }

    // 4. Parsear el cuerpo de la solicitud
    let bodyData;
    try {
      bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid Request", details: "JSON body parsing failed." })
      };
    }

    if (!bodyData || !bodyData.prompt) {
       return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid Request", details: "Missing 'prompt' in request." })
      };
    }

    const { prompt, systemInstruction, config } = bodyData;

    // 5. Llamada a Google Gemini
    const ai = new GoogleGenAI({ apiKey });
    
    // CAMBIO IMPORTANTE: Usamos 'gemini-2.0-flash' que es más estable públicamente que el '3-preview'.
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
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
    // Devolvemos el mensaje real del error para verlo en el frontend
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "AI Service Failed", 
        details: error.message || JSON.stringify(error)
      })
    };
  }
};
