
import { GoogleGenAI } from "@google/genai";

export const handler = async (event: Request) => {
  // Manejo básico de CORS para permitir llamadas desde el propio dominio
  if (event.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (event.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("API Key no configurada en el entorno del servidor.");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { prompt, systemInstruction, config } = await event.json();

    const ai = new GoogleGenAI({ apiKey });

    // Usamos el modelo flash por defecto, o el que se especifique
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: config?.temperature || 0.2,
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*" 
      }
    });

  } catch (error) {
    console.error("Error en Netlify Function:", error);
    return new Response(JSON.stringify({ error: "Error processing AI request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
