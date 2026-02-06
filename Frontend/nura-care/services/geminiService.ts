import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DementiaStage, AISuggestionResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCaregiverSuggestions = async (
  stage: DementiaStage, 
  lifestyles: string[]
): Promise<AISuggestionResponse> => {
  
  const lifestyleString = lifestyles.length > 0 
    ? `They have a lifestyle/background in: ${lifestyles.join(', ')}.` 
    : 'No specific lifestyle details provided yet.';

  const prompt = `
    I am configuring a care companion chatbot for a patient with ${stage} dementia.
    ${lifestyleString}
    
    Based on this stage and lifestyle, please suggest:
    1. 3 safe, engaging conversation topics.
    2. 3 potential confusion triggers to avoid.
    3. 1 simple memory or activity prompt suitable for their capability.
    
    Keep suggestions concise and empathetic.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      suggestedSafeTopics: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of safe topics",
      },
      suggestedTriggers: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of topics to avoid",
      },
      suggestedActivity: {
        type: Type.STRING,
        description: "One specific activity suggestion",
      },
    },
    required: ["suggestedSafeTopics", "suggestedTriggers", "suggestedActivity"],
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AISuggestionResponse;
  } catch (error) {
    console.error("Error fetching AI suggestions:", error);
    // Fallback in case of error
    return {
      suggestedSafeTopics: ["Music from their youth", "Weather", "Family photos"],
      suggestedTriggers: ["Complex financial questions", "Recent political events"],
      suggestedActivity: "Listening to favorite songs",
    };
  }
};