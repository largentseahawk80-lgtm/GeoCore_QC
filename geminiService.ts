
import { GoogleGenAI, Schema, Type } from "@google/genai";
import { GeoLocation } from '../types';

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

// Edit Image using Gemini 2.5 Flash Image
export const editSitePhoto = async (
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `Edit this construction site image: ${prompt}. Return only the edited image.`,
          },
        ],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data returned from Gemini. Ensure the prompt requests a visual output.");
  } catch (error) {
    console.error("Gemini Edit Error:", error);
    throw error;
  }
};

// Maps Grounding using Gemini 2.5 Flash
export const getLocationContext = async (geo: GeoLocation): Promise<string> => {
  const ai = getAiClient();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "What is this location? Describe the area and any nearby landmarks relevant to a construction site.",
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: geo.lat,
              longitude: geo.lng
            }
          }
        }
      },
    });

    let text = response.text || "No information found.";
    
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (chunks) {
       const links = chunks.map((c: any) => c.maps?.uri).filter(Boolean);
       if (links.length > 0) {
         text += `\n\nGoogle Maps Links:\n${links.join('\n')}`;
       }
    }

    return text;
  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return "Unable to fetch location data at this time.";
  }
};

/**
 * Parses natural language voice transcripts into structured JSON for specific logs.
 */
export const parseVoiceLog = async (transcript: string, logType: string): Promise<any> => {
  const ai = getAiClient();
  
  // Define schemas based on log type
  let schema: Schema;

  switch (logType) {
    case 'panel':
      schema = {
        type: Type.OBJECT,
        properties: {
          panelNumber: { type: Type.STRING },
          rollNumber: { type: Type.STRING },
          widthFt: { type: Type.NUMBER },
          materialType: { type: Type.STRING },
        }
      };
      break;
    case 'repair':
      schema = {
        type: Type.OBJECT,
        properties: {
          repairNumber: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Patch', 'Bead', 'Grind', 'Extrusion'] },
          nearestPanelId: { type: Type.STRING },
          size: { type: Type.STRING },
          technician: { type: Type.STRING },
        }
      };
      break;
    case 'welder':
      schema = {
        type: Type.OBJECT,
        properties: {
          seamId: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Wedge', 'Extrusion'] },
          machineId: { type: Type.STRING },
          technician: { type: Type.STRING },
          temperature: { type: Type.NUMBER },
          speed: { type: Type.NUMBER },
        }
      };
      break;
    case 'dt':
      schema = {
        type: Type.OBJECT,
        properties: {
          sampleId: { type: Type.STRING },
          machineId: { type: Type.STRING },
          peelResults: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          shearResults: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        }
      };
      break;
    case 'airTest':
      schema = {
        type: Type.OBJECT,
        properties: {
          seamId: { type: Type.STRING },
          technician: { type: Type.STRING },
          startPressure: { type: Type.NUMBER },
          endPressure: { type: Type.NUMBER },
        }
      };
      break;
    case 'trial':
      schema = {
        type: Type.OBJECT,
        properties: {
          trialId: { type: Type.STRING },
          type: { type: Type.STRING, enum: ['Wedge', 'Extrusion'] },
          machineId: { type: Type.STRING },
          technician: { type: Type.STRING }, // Welder
          inspector: { type: Type.STRING }, // QC
          material: { type: Type.STRING },
          temperature: { type: Type.NUMBER },
          preHeatTemp: { type: Type.NUMBER },
          speed: { type: Type.NUMBER },
          peelResults: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          shearResults: { type: Type.ARRAY, items: { type: Type.NUMBER } },
        }
      };
      break;
    case 'vacuum':
      schema = {
        type: Type.OBJECT,
        properties: {
          logNumber: { type: Type.STRING },
          technician: { type: Type.STRING },
          notes: { type: Type.STRING },
        }
      };
      break;
    case 'gatekeeper':
      schema = {
         type: Type.OBJECT,
         properties: {
           inspector: { type: Type.STRING },
           temperature: { type: Type.NUMBER },
           windSpeed: { type: Type.NUMBER },
           notes: { type: Type.STRING },
         }
      };
      break;
    default:
      schema = { type: Type.OBJECT, properties: {} };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract the following ${logType} data from this transcript: "${transcript}". 
                 Return JSON only. If a value is not mentioned, omit the field.
                 For arrays (like peelResults), extract all numbers mentioned in context.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    if (response.text) {
        return JSON.parse(response.text);
    }
    return {};
  } catch (error) {
    console.error("Parse Voice Log Error:", error);
    return {};
  }
};
    