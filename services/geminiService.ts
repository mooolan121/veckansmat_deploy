
import { GoogleGenAI, Type } from "@google/genai";
import { Recipe } from "../types";

// Correctly initialize GoogleGenAI using process.env.API_KEY directly as per guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateRecipe = async (dishName: string, portions: number): Promise<Recipe> => {
  // Use 'gemini-3-pro-preview' for complex tasks like creating a detailed recipe.
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Skapa ett detaljerat recept för "${dishName}" på svenska för ${portions} personer. 
    Inkludera exakta mängder och steg-för-steg instruktioner.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          dishName: { type: Type.STRING },
          cookingTime: { type: Type.STRING },
          difficulty: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                unit: { type: Type.STRING }
              },
              required: ["name", "amount", "unit"]
            }
          },
          steps: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["dishName", "ingredients", "steps", "cookingTime", "difficulty"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as Recipe;
};
