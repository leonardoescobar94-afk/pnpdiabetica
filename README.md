# Polineuropathy-Assistant Electrodiagnóstico PMR

**Herramienta Profesional para Especialistas en Medicina Física y Rehabilitación.**

Esta aplicación es una herramienta avanzada diseñada para asistir en el análisis de estudios de neuroconducción, facilitando la comparación con valores de referencia y la clasificación de la severidad de la neuropatía diabética sensitivo-motora según la escala de Davies et al.

## Características Principales

*   **Análisis Automático:** Cálculo de Score #2 (Diagnóstico) y Score #4 (Severidad) basado en percentiles normalizados.
*   **Ajuste Dinámico:** Valores de referencia ajustados automáticamente por edad y altura del paciente.
*   **Asistente con IA:** Integración con Google Gemini para generar resúmenes clínicos y sugerencias de seguimiento basadas en los hallazgos.
*   **Generación de Informes:** Exportación de resultados en formatos PDF profesional y TXT para historias clínicas.
*   **Referencias Académicas:** Basado en estudios de Dyck, Buschbacher y Davies (Rochester Diabetic Neuropathy Study).

## Requisitos Previos

*   Node.js (versión 18 o superior)
*   NPM

## Instalación y Ejecución Local

1.  **Instalar dependencias:**
    ```bash
    npm install
    ```

2.  **Configurar Variables de Entorno:**
    Crea un archivo `.env` o `.env.local` en la raíz del proyecto y añade tu clave de API de Google Gemini. La aplicación soporta ambas nomenclaturas:
    ```env
    API_KEY=tu_clave_de_api_aqui
    # O alternativamente:
    GEMINI_API_KEY=tu_clave_de_api_aqui
    ```

3.  **Ejecutar la aplicación:**
    ```bash
    npm run dev
    ```

## Despliegue

El proyecto está configurado (ver `netlify.toml` y `vite.config.ts`) para desplegarse fácilmente en plataformas como Netlify. Asegúrate de configurar la variable de entorno `API_KEY` en el panel de configuración de tu proveedor de hosting.

## Autoría y Desarrollo

*   **Concepto y Desarrollo:** Dr. Leonardo Jurado - Residente de Medicina Física y Rehabilitación, Universidad Nacional de Colombia.
*   **Plataforma:** Desarrollada con asistencia de Inteligencia Artificial bajo la supervisión de Leo J Escobar.
*   **Propósito:** Académico y de apoyo clínico. Sin ánimo de lucro.

---
© 2024 Polineuropathy-Assistant Electrodiagnóstico PMR Specialist Platform
