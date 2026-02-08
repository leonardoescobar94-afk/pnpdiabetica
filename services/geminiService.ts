
import { GoogleGenAI } from "@google/genai";
import { PatientData, NerveReading, AnalysisResult } from "../types";

export const getClinicalSummary = async (
  patient: PatientData,
  readings: NerveReading[],
  analysis: AnalysisResult,
  lang: 'es' | 'en' = 'es'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const abnormalities = [
    ...analysis.score2.details,
    ...analysis.score4.details
  ].filter(d => d.points > 0).map(d => d.nerve);

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

  const systemInstruction = lang === 'es' 
    ? "Actúa como un médico especialista experto en Medicina Física y Rehabilitación y Neurofisiología Clínica. Tu objetivo es proporcionar interpretaciones electrofisiológicas precisas basadas en la escala de Davies para polineuropatía diabética."
    : "Act as an expert physician specializing in Physical Medicine and Rehabilitation (PM&R) and Clinical Neurophysiology. Your goal is to provide precise electrophysiological interpretations based on the Davies scale for diabetic polyneuropathy.";

  const prompt = lang === 'es'
    ? `
    Analiza los siguientes resultados de neuroconducción para un paciente con sospecha de polineuropatía diabética (DSPN).

    DATOS DEL PACIENTE:
    Edad: ${patient.age} años | Altura: ${patient.height} cm

    HALLAZGOS:
    ${findingsList}
    
    RESULTADO AUTOMÁTICO (Escala de Davies):
    Clasificación: ${analysis.severityClass}
    Nervios anormales (P < 3% o P < 1%): ${abnormalities.length > 0 ? abnormalities.join(', ') : 'Ninguno'}.

    REQUERIMIENTO:
    Genera un concepto clínico breve (máximo 120 palabras). 
    1. Define si el patrón es predominantemente axonal, desmielinizante o mixto.
    2. Correlaciona con el Score #2 (Diagnóstico) y Score #4 (Severidad Axonal).
    3. Sugiere brevemente si requiere seguimiento o estudios complementarios (ej. EMG de aguja si hay duda de cronicidad).
    
    IMPORTANTE: Usa terminología médica de nivel especialista. Responde en ESPAÑOL.
    `
    : `
    Analyze the following nerve conduction results for a patient with suspected diabetic sensorimotor polyneuropathy (DSPN).

    PATIENT DATA:
    Age: ${patient.age} years | Height: ${patient.height} cm

    FINDINGS:
    ${findingsList}
    
    AUTOMATIC RESULT (Davies Scale):
    Classification: ${analysis.severityClass}
    Abnormal nerves (P < 3% or P < 1%): ${abnormalities.length > 0 ? abnormalities.join(', ') : 'None'}.

    REQUIREMENT:
    Generate a brief clinical concept (max 120 words).
    1. Define if the pattern is predominantly axonal, demyelinating, or mixed.
    2. Correlate with Score #2 (Diagnosis) and Score #4 (Axonal Severity).
    3. Briefly suggest follow-up or complementary studies (e.g., needle EMG if chronicity is in question).
    
    IMPORTANT: Use specialist-level medical terminology. Respond in ENGLISH.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.2, // Baja temperatura para mayor precisión médica
      }
    });
    
    return response.text || (lang === 'es' ? "No se pudo generar el resumen." : "Summary could not be generated.");
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'es' 
      ? "Error al conectar con el servicio de análisis inteligente." 
      : "Error connecting to the smart analysis service.";
  }
};
