
import { NerveReading, PatientData, ScoreDetail, AnalysisResult, NerveType } from '../types';
import { TEXTS } from '../constants';

/**
 * Función de Distribución Acumulada (CDF) para la distribución normal estándar.
 */
const normCDF = (x: number): number => {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp(-x * x / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.7814779 + t * (-1.821256 + t * 1.3302744))));
  return x >= 0 ? 1 - p : p;
};

const getZScore = (value: number, mean: number, sd: number) => (value - mean) / sd;

/**
 * Linear Interpolation
 */
const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

/**
 * Returns a factor between 0 and 1 based on where 'value' falls within a transition window.
 * Below window = 0, Above window = 1.
 */
const getTransitionFactor = (value: number, threshold: number, windowSize: number): number => {
  const halfWindow = windowSize / 2;
  const start = threshold - halfWindow;
  const end = threshold + halfWindow;
  
  if (value <= start) return 0;
  if (value >= end) return 1;
  return (value - start) / windowSize;
};

/**
 * CONTINUOUS MODEL PREDICTORS
 * These functions calculate Mean and SD based on Age and Height using continuous interpolation
 * to avoid step artifacts at bin boundaries.
 */

// Tibial Amplitude: Transitions at 30 and 60.
// Data Points derived from: 
// <30: 15.3, 4.5
// 30-59: 12.9, 4.5
// >60: 9.8, 4.2
const getTibialAmpStats = (age: number) => {
  // Define states
  const young = { mean: 15.3, sd: 4.5 };
  const middle = { mean: 12.9, sd: 4.5 };
  const old = { mean: 9.8, sd: 4.2 }; // SD modified to 4.2 as per user request

  // Transition 1: Around age 30 (25-35)
  const t1 = getTransitionFactor(age, 30, 10);
  // Transition 2: Around age 60 (55-65)
  const t2 = getTransitionFactor(age, 60, 10);

  // If completely young
  if (t1 === 0) return young;
  
  // Interpolate Young -> Middle
  if (t1 > 0 && t1 < 1) {
    return {
      mean: lerp(young.mean, middle.mean, t1),
      sd: lerp(young.sd, middle.sd, t1)
    };
  }

  // If completely middle (before old transition)
  if (t2 === 0) return middle;

  // Interpolate Middle -> Old
  return {
    mean: lerp(middle.mean, old.mean, t2),
    sd: lerp(middle.sd, old.sd, t2)
  };
};

// Fibular Amplitude: Transition at 40.
// <40: 6.8, 2.5
// >40: 5.1, 2.5
const getFibularAmpStats = (age: number) => {
  const young = { mean: 6.8, sd: 2.5 };
  const old = { mean: 5.1, sd: 2.5 };

  // Transition around age 40 (35-45)
  const t = getTransitionFactor(age, 40, 10);

  return {
    mean: lerp(young.mean, old.mean, t),
    sd: lerp(young.sd, old.sd, t)
  };
};

// Tibial Velocity: Depends on Age and Height.
// Age Split: 50 (Transition 45-55)
// Height Anchors: 155 (<160), 165 (160-169), 175 (>170)
const getTibialVelStats = (age: number, height: number) => {
  // Helper to interpolate across height anchors
  const interpolateHeight = (h: number, v155: number, v165: number, v175: number) => {
    if (h <= 155) return v155;
    if (h >= 175) return v175;
    if (h < 165) return lerp(v155, v165, (h - 155) / 10);
    return lerp(v165, v175, (h - 165) / 10);
  };

  // Define Groups
  // Group A (Young < 50)
  const meanA = interpolateHeight(height, 51, 49, 47);
  const sdA = interpolateHeight(height, 4, 6, 5);

  // Group B (Old >= 50)
  const meanB = interpolateHeight(height, 49, 45, 44); // 44 as per modified request
  const sdB = interpolateHeight(height, 5, 5, 5);

  // Blend based on Age (Window 45-55)
  const tAge = getTransitionFactor(age, 50, 10);

  return {
    mean: lerp(meanA, meanB, tAge),
    sd: lerp(sdA, sdB, tAge)
  };
};

// Fibular Velocity: Depends on Age and Height.
// Age Split: 40 (Transition 35-45)
// Height Split: 170 (Transition 165-175)
const getFibularVelStats = (age: number, height: number) => {
  // Young (<40)
  const youngLowH = { mean: 49, sd: 4 };
  const youngHighH = { mean: 46, sd: 4 };

  // Old (>=40)
  const oldLowH = { mean: 47, sd: 5 };
  const oldHighH = { mean: 44, sd: 4 };

  // Height Transition Factor (0 = <165, 1 = >175)
  const tHeight = getTransitionFactor(height, 170, 10);

  // Resolve Height first
  const currentYoung = {
    mean: lerp(youngLowH.mean, youngHighH.mean, tHeight),
    sd: lerp(youngLowH.sd, youngHighH.sd, tHeight)
  };

  const currentOld = {
    mean: lerp(oldLowH.mean, oldHighH.mean, tHeight),
    sd: lerp(oldLowH.sd, oldHighH.sd, tHeight)
  };

  // Resolve Age second (Window 35-45)
  const tAge = getTransitionFactor(age, 40, 10);

  return {
    mean: lerp(currentYoung.mean, currentOld.mean, tAge),
    sd: lerp(currentYoung.sd, currentOld.sd, tAge)
  };
};


const calculatePoints = (
  percentile: number, 
  nerveName: string, 
  paramType: 'vel' | 'lat' | 'amp', 
  age: number
): number => {
  // Latency (Sural) - Score 2
  if (paramType === 'lat') {
    if (percentile > 0.99) return 2;
    if (percentile > 0.97) return 1; // Modified to 97
    return 0;
  }

  // Amplitude - Score 4 Exceptions
  // Note: While the Stats are continuous, the SCORING RULES (Cutoffs) remain specific to age groups
  // as defined in the requirements.
  if (paramType === 'amp') {
    // Sural Amplitude Exception
    if (nerveName.includes('Sural')) {
      if (percentile < 0.067) return 2; // Modified to 6.7
      if (percentile < 0.097) return 1; // Modified to 9.7
      return 0;
    }

    // Tibial Amplitude Exception (Age 60-79)
    if (nerveName.includes('Tibial') && age >= 60 && age <= 79) {
      if (percentile < 0.018) return 2; // Modified to 1.8
      if (percentile < 0.030) return 1; // Modified to 3.0
      return 0;
    }

    // Fibular (Peroneal) Amplitude Exception (Age 40-79)
    if (nerveName.includes('Fibular') && age >= 40 && age <= 79) {
      if (percentile < 0.03) return 2; // Modified to 3
      if (percentile < 0.055) return 1; // Modified to 5.5
      return 0;
    }
  }

  // Standard Rule for Velocity and other Amplitudes
  // < 1st percentile -> 2 points
  // < 3rd percentile -> 1 point (Modified to 3)
  // 3rd to 95th -> 0 points
  if (percentile < 0.01) return 2;
  if (percentile < 0.03) return 1;
  return 0;
};

const parseInputValue = (val: string | number): number | 'NR' => {
  if (typeof val === 'string' && val.trim().toUpperCase() === 'NR') return 'NR';
  const parsed = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
  return isNaN(parsed) ? 0 : parsed;
};

export const runFullAnalysis = (readings: NerveReading[], patient: PatientData, lang: 'es' | 'en' = 'es'): AnalysisResult => {
  const score2Details: ScoreDetail[] = [];
  const score4Details: ScoreDetail[] = [];

  const ulnarStats = { amp: { mean: 11.6, sd: 2.1 }, vel: { mean: 61, sd: 5 } };
  const suralStats = { lat: { mean: 3.8, sd: 0.3 }, amp: { mean: 17, sd: 10 } };

  // Variables para rastrear puntos específicos para la lógica de diagnóstico Score #2
  let s2SuralPoints = 0;
  let s2MotorPoints = 0;

  readings.forEach(r => {
    let stats: { amp?: { mean: number, sd: number }, vel?: { mean: number, sd: number }, lat?: { mean: number, sd: number } } = {};
    
    // Select Continuous Prediction Models
    if (r.nerveName.includes('Tibial')) {
      stats = {
        amp: getTibialAmpStats(patient.age),
        vel: getTibialVelStats(patient.age, patient.height)
      };
    } else if (r.nerveName.includes('Fibular')) {
      stats = {
        amp: getFibularAmpStats(patient.age),
        vel: getFibularVelStats(patient.age, patient.height)
      };
    } else if (r.nerveName.includes('Ulnar')) {
      stats = ulnarStats;
    } else if (r.nerveName.includes('Sural')) {
      stats = suralStats;
    }

    const vVal = parseInputValue(r.velocity);
    const aVal = parseInputValue(r.amplitude);
    const pVal = r.peakLatency ? parseInputValue(r.peakLatency) : 0;

    // --- Score #2 (Diagnóstico) ---
    // Considera: Velocidad Fibular, Tibial, Ulnar (Motor) y Latencia Sural (Sensitivo)
    if (r.type === NerveType.MOTOR) {
      if (vVal === 'NR') {
        const pts = 2;
        s2MotorPoints += pts;
        score2Details.push({ nerve: r.nerveName, value: 'NR', percentile: 0.001, points: pts });
      } else if (vVal > 0 && stats.vel) {
        const z = getZScore(vVal, stats.vel.mean, stats.vel.sd);
        const p = normCDF(z);
        const points = calculatePoints(p, r.nerveName, 'vel', patient.age);
        s2MotorPoints += points;
        score2Details.push({ nerve: r.nerveName, value: vVal, percentile: p, points });
      }
    } else if (r.nerveName.includes('Sural')) {
      if (pVal === 'NR') {
        const pts = 2;
        s2SuralPoints += pts;
        score2Details.push({ nerve: 'Sural (Latencia)', value: 'NR', percentile: 0.999, points: pts });
      } else if (pVal > 0 && stats.lat) {
        const z = getZScore(pVal, stats.lat.mean, stats.lat.sd);
        const p = normCDF(z);
        const points = calculatePoints(p, r.nerveName, 'lat', patient.age);
        s2SuralPoints += points;
        score2Details.push({ nerve: 'Sural (Latencia)', value: pVal, percentile: p, points });
      }
    }

    // --- Score #4 (Severidad) ---
    // Considera: Amplitud de todos (Fibular, Tibial, Ulnar, Sural)
    if (aVal === 'NR') {
      score4Details.push({ nerve: r.nerveName, value: 'NR', percentile: 0.001, points: 2 });
    } else if (aVal > 0 && stats.amp) {
      const z = getZScore(aVal, stats.amp.mean, stats.amp.sd);
      const p = normCDF(z);
      const points = calculatePoints(p, r.nerveName, 'amp', patient.age);
      score4Details.push({ nerve: r.nerveName, value: aVal, percentile: p, points });
    }
  });

  const s2Total = score2Details.reduce((acc, curr) => acc + curr.points, 0);
  const s4Total = score4Details.reduce((acc, curr) => acc + curr.points, 0);
  
  // --- Clasificación Score #2 ---
  let interpretationBody = TEXTS[lang].s2NormalBody;
  let s2Abnormal = false;
  let diagnosisClass = TEXTS[lang].normal;

  if (s2Total >= 2) {
    s2Abnormal = true;
    diagnosisClass = TEXTS[lang].abnormal;
    // Lógica específica:
    // Sural alterado (>0) y al menos un motor alterado (>0) -> Sensitivo Motora
    if (s2SuralPoints > 0 && s2MotorPoints > 0) {
      interpretationBody = TEXTS[lang].s2SensorimotorBody;
    } 
    // Sural alterado (>0) y motores normales (0) -> Sensitiva
    else if (s2SuralPoints > 0 && s2MotorPoints === 0) {
      interpretationBody = TEXTS[lang].s2SensoryBody;
    } 
    // Caso borde: Sural normal (0) pero Score total >= 2 (significa motores muy afectados)
    else {
      interpretationBody = TEXTS[lang].s2AbnormalGeneric;
    }
  }
  
  // --- Clasificación Score #4 (Severidad) ---
  // 0 pts: Sin evidencia de daño axonal
  // 1-2 pts: Leve
  // 3-5 pts: Moderada
  // 6-8 pts: Severa
  
  const s4Abnormal = s4Total >= 1; // Anormal si >= 1
  
  let severityLabel = TEXTS[lang].noAxonalDamage; 
  if (s4Total >= 6) severityLabel = TEXTS[lang].severe;
  else if (s4Total >= 3) severityLabel = TEXTS[lang].moderate;
  else if (s4Total >= 1) severityLabel = TEXTS[lang].mild;
  
  // Composite string for display
  const finalSeverityClass = `${diagnosisClass} / ${severityLabel}`;

  return {
    score2: { total: s2Total, isAbnormal: s2Abnormal, details: score2Details, interpretationBody },
    score4: { total: s4Total, isAbnormal: s4Abnormal, details: score4Details, severityLabel },
    severityClass: finalSeverityClass,
    diagnosisClass: diagnosisClass
  };
};
