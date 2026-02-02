import { GoogleGenAI } from "@google/genai";
import { PatientData, NerveReading, AnalysisResult } from "../types";

export const getClinicalSummary = async (
  patient: PatientData,
  readings: NerveReading[],
  analysis: AnalysisResult
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Derive abnormalities from analysis details
  const abnormalities = [
    ...analysis.score2.details,
    ...analysis.score4.details
  ].filter(d => d.points > 0).map(d => d.nerve);

  // Formatear los hallazgos según el tipo de nervio para mayor precisión clínica
  const findingsList = readings.map(r => {
    const isSural = r.nerveName.includes('Sural');
    let details = '';
    
    if (isSural) {
      details = `Latencia Pico: ${r.peakLatency || 'NR'} ms, Amplitud: ${r.amplitude} uV`;
    } else {
      details = `Velocidad: ${r.velocity || 'NR'} m/s, Amplitud: ${r.amplitude} mV`;
    }
    
    return `- ${r.nerveName}: ${details}`;
  }).join('\n');

  const prompt = `
    Actúa como un médico especialista experto en Medicina Física y Rehabilitación y Neurofisiología Clínica.
    Analiza los siguientes resultados de neuroconducción para un paciente con sospecha o antecedentes de diabetes.

    DATOS DEL PACIENTE:
    Edad: ${patient.age} años
    Altura: ${patient.height} cm

    HALLAZGOS ELECTROFISIOLÓGICOS:
    ${findingsList}
    
    RESULTADO DEL ANÁLISIS AUTOMÁTICO (Escala de Davies):
    Clasificación: ${analysis.severityClass}
    Nervios con hallazgos anormales (según percentiles): ${abnormalities.length > 0 ? abnormalities.join(', ') : 'Ninguno'}.

    TAREA:
    Genera un concepto clínico conciso y profesional (máximo 150 palabras) que incluya:
    1. Interpretación del patrón (ej. ¿Predominio axonal, desmielinizante, mixto? ¿Sensitivo puro o sensitivo-motor?).
    2. Correlación con la clasificación de severidad obtenida.
    3. Una breve recomendación de conducta o seguimiento clínico.

    Usa terminología médica precisa. No incluyas saludos ni explicaciones obvias, ve directo al concepto.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "No se pudo generar el resumen clínico.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Error al conectar con el servicio de análisis inteligente. Verifique su conexión o API Key.";
  }
};