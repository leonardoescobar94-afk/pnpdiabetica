
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: any) => {
  // Manejo de CORS (Pre-flight requests)
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

  // Validar método POST (En Netlify V1 se usa httpMethod, no method)
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };
  }

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("API Key no configurada en el entorno del servidor.");
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Server configuration error: API Key missing" })
      };
    }

    // Parsear el cuerpo del mensaje (en Netlify V1 body es un string)
    if (!event.body) {
       return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing request body" })
      };
    }

    const { prompt, systemInstruction, config } = JSON.parse(event.body);

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

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      },
      body: JSON.stringify({ text: response.text })
    };

  } catch (error: any) {
    console.error("Error en Netlify Function:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error processing AI request", details: error.message })
    };
  }
};
