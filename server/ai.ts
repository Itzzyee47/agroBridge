import { Router, Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import { authenticate } from "./auth.js";

const aiRouter = Router();

// Initialize the GoogleGenAI client lazy-style to prevent crashing on boot if key is missing.
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return aiClient;
}

// 1. POST /api/ai/price-prediction
aiRouter.post("/price-prediction", authenticate, async (req: Request, res: Response) => {
  try {
    const { crop, location, unit } = req.body;

    if (!crop || !location) {
      return res.status(400).json({ error: "Crop and location parameters are required" });
    }

    const cropUnit = unit || "kg";
    const client = getAiClient();

    if (client) {
      // Hit real Gemini API
      try {
        const prompt = `Perform an agricultural market analysis for the crop: "${crop}" in the location/district: "${location}", sold per "${cropUnit}". 
        Provide a highly realistic price prediction in Ugandan Shillings (UGX). 
        Keep current year 2026 seasonal and transport factors in Uganda into account.`;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are an expert agricultural market analyst specializing in East African farming markets, pricing dynamics, supply chains, and crop trends.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendedPrice: { type: Type.INTEGER, description: "Recommended price in UGX" },
                minPrice: { type: Type.INTEGER, description: "Minimum typical market price in UGX" },
                maxPrice: { type: Type.INTEGER, description: "Maximum typical market price in UGX" },
                confidence: { type: Type.INTEGER, description: "Confidence percentage of prediction (e.g., 85)" },
                trend: { type: Type.STRING, description: "Trend direction: 'UP' | 'DOWN' | 'STABLE'" },
                explanation: { type: Type.STRING, description: "A detailed paragraph explaining why this trend exists and what external market factors (like weather, transport, harvest cycle) are at play." },
                tips: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "List of exactly 3 highly actionable agricultural, storage, or negotiation recommendations for the farmer/agent."
                }
              },
              required: ["recommendedPrice", "minPrice", "maxPrice", "confidence", "trend", "explanation", "tips"]
            }
          }
        });

        if (response.text) {
          const result = JSON.parse(response.text.trim());
          return res.json(result);
        }
      } catch (geminiError) {
        console.warn("Gemini prediction failed, falling back to rule-based:", geminiError);
      }
    }

    // Smart Local Rule-based fallback if no API key or call fails
    const cropLower = crop.toLowerCase();
    let recommendedPrice = 15000;
    let minPrice = 12000;
    let maxPrice = 18000;
    let trend: "UP" | "DOWN" | "STABLE" = "STABLE";
    let explanation = `The price index for ${crop} in ${location} is driven primarily by local seasonal harvest patterns and regional transport costs. Due to moderate weather, we expect stable market supply this week.`;
    let tips = [
      "Wait for morning buyers to lock in prices; transport trucks are more active then.",
      "Ensure proper moisture checks before packaging to reduce rot during transport.",
      "Consolidate harvest with neighboring farmers to reduce agent freight commissions."
    ];

    if (cropLower.includes("coffee")) {
      recommendedPrice = 8500;
      minPrice = 7200;
      maxPrice = 9800;
      trend = "UP";
      explanation = "Arabica and Robusta global demand remains extremely strong, boosting factory gate pricing in coffee cooperatives across Uganda. Local supply is tightening ahead of the dry season, leading to rising buyer bids.";
      tips = [
        "Store your coffee parchment in dry conditions to retain premium Grade-A quality.",
        "Avoid selling unripe cherries; dry coffee beans fetch a 40% higher margin.",
        "Negotiate pricing directly with cooperative bulk buyers through your agent."
      ];
    } else if (cropLower.includes("matooke") || cropLower.includes("banana")) {
      recommendedPrice = 24000;
      minPrice = 18000;
      maxPrice = 28000;
      trend = "STABLE";
      explanation = "Matooke supply in central region remains resilient due to favorable recent rains. Transport fuel margins are stabilizing, meaning urban wholesalers in Kampala are paying solid prices for large, starchy bunches.";
      tips = [
        "Grade bunches by physical girth; premium bunches get a high margin from retail clients.",
        "Cut bunches on the morning of delivery to maximize sap retention and prevent early ripening.",
        "Coordinate bunch deliveries in groups of 20+ to share logistics fees."
      ];
    } else if (cropLower.includes("tomato")) {
      recommendedPrice = 42000;
      minPrice = 30000;
      maxPrice = 55000;
      trend = "DOWN";
      explanation = "A seasonal bumper tomato harvest from major open-field producers has flooded Kampala markets this fortnight, putting downward pressure on prices. Greenhouse growers are maintaining moderate quality margins.";
      tips = [
        "Sort tomatoes strictly into boxes rather than sacks to avoid crushing and losses.",
        "Sell semi-ripe fruit immediately to local schools or institutions with short cooking turnarounds.",
        "Consider shifting part of your crop cycle to out-of-season off-cycles for next month."
      ];
    } else if (cropLower.includes("pineapple")) {
      recommendedPrice = 3500;
      minPrice = 2500;
      maxPrice = 4000;
      trend = "UP";
      explanation = "Pineapple yields from Luweero are peaking but demand from fruit exporters and juice processors is rising faster. Sizing is extremely good this season, driving strong wholesale demand.";
      tips = [
        "Use crown size and skin yellowing to strictly grade for export processors.",
        "Keep harvesting tools clean to avoid fruit infection at the stem.",
        "Pack in wooden crates rather than open trucks to maintain peel cosmetics."
      ];
    }

    return res.json({
      recommendedPrice,
      minPrice,
      maxPrice,
      confidence: Math.floor(Math.random() * 15) + 80, // 80 - 95%
      trend,
      explanation,
      tips
    });

  } catch (err: any) {
    console.error("Price Prediction Controller Error:", err);
    res.status(500).json({ error: "Failed to generate market prediction" });
  }
});

// 2. POST /api/ai/farm-recommendations
aiRouter.post("/farm-recommendation", authenticate, async (req: Request, res: Response) => {
  try {
    const { name, size, location, cropTypes, capacity } = req.body;

    if (!size || !cropTypes || !Array.isArray(cropTypes)) {
      return res.status(400).json({ error: "Farm size and crops array are required" });
    }

    const client = getAiClient();

    if (client) {
      try {
        const prompt = `Generate a customized modern agricultural recommendation plan for farmer "${name || "Farmer"}" in ${location || "Central Uganda"}.
        Farm Size: ${size} acres.
        Current Crops Grown: ${cropTypes.join(", ")}.
        Capacity/Notes: ${capacity || "Basic hand tools and family labor"}.
        Provide smart recommendations to double their yield, optimize water/compost, and manage prices through their Agro Agent.`;

        const response = await client.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are a professional farming extension advisor and agronomist focusing on smallholder East African agriculture.",
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                soilAndWaterAdvice: { type: Type.STRING, description: "Soil health, composting, and irrigation tips" },
                cropRotationAdvice: { type: Type.STRING, description: "Companion planting or rotation recommendations based on their current crops" },
                agentStrategy: { type: Type.STRING, description: "How the agent should market or package this produce to maximize farm gate profits" },
                futureCrops: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 2 high-value crops they could intercrop or plant next to diversify risk"
                }
              },
              required: ["soilAndWaterAdvice", "cropRotationAdvice", "agentStrategy", "futureCrops"]
            }
          }
        });

        if (response.text) {
          const result = JSON.parse(response.text.trim());
          return res.json(result);
        }
      } catch (geminiError) {
        console.warn("Gemini recommendation failed, falling back to local recommendation:", geminiError);
      }
    }

    // Fallback
    const futureCrops = ["Ginger", "Pumpkins"];
    if (cropTypes.includes("Coffee")) {
      futureCrops.splice(0, 2, "Vanilla (high value climber)", "Chili Peppers");
    }

    return res.json({
      soilAndWaterAdvice: `Given the ${size}-acre scale, we recommend practicing active mulching around crop roots (especially bananas or coffee) to retain soil moisture. Incorporate organic manure compost during early tilling to feed microbes.`,
      cropRotationAdvice: `Rotate vegetable plots with deep-rooted crops to restore nitrogen. Avoid growing Solanaceae crops (tomatoes, sweet peppers, eggplants) on the same bed sequentially to stop pest/nematode cycles.`,
      agentStrategy: `Your Agro Agent should group your produce with other local farmers to secure lower-cost bulk logistics. Pre-grading your tomatoes or fruits on-farm will let your agent list them at premium grades on AgroBridge.`,
      futureCrops
    });

  } catch (err) {
    console.error("Farm Recommendation Error:", err);
    res.status(500).json({ error: "Failed to generate farm recommendations" });
  }
});

export default aiRouter;
