import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let firebaseAppletConfig: any = {};
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
} catch (e) {
  console.warn("Could not read firebase-applet-config.json:", e);
}

const app = express();
const PORT = 3000;

app.use(express.json());

// MapVina proxy: keeps the provider key on the server, never in the browser bundle.
app.get("/api/mapvina/tile/:z/:x/:y.png", async (req, res) => {
  const apiKey = process.env.MAPVINA_API_KEY;
  const { z, x, y } = req.params;
  if (!apiKey || !/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
    return res.status(404).end();
  }

  try {
    const upstream = await fetch(
      `https://maps.mapvina.com/api/v1/tile/${z}/${x}/${y}.png?key=${encodeURIComponent(apiKey)}`
    );
    if (!upstream.ok || !upstream.body) return res.status(upstream.status || 502).end();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    const buffer = Buffer.from(await upstream.arrayBuffer());
    return res.send(buffer);
  } catch (error) {
    console.error('MapVina tile proxy error:', error);
    return res.status(502).end();
  }
});

// API Endpoint: Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "Human Map",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

interface GeminiUsageEntry {
  minuteCount: number;
  minuteResetAt: number;
  dayCount: number;
  dayResetAt: number;
}

const geminiUsage = new Map<string, GeminiUsageEntry>();
const GEMINI_MAX_INPUT_CHARS = 500;
const GEMINI_RATE_WINDOW_MS = 60 * 1000;
const GEMINI_DAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const GEMINI_MAX_REQUESTS_PER_MINUTE = 10;
const GEMINI_DAILY_LIMITS: Record<string, number> = {
  "parse-need": 5,
  "classify-risk": 5,
  "generate-story": 3,
  "optimize-profile": 3,
  "profile-advice": 1,
  "match-explanation": 10,
  "generate-human-story": 3,
  "extract-story-themes": 2,
};
const MAX_GEMINI_USAGE_ENTRIES = 5000;
const profileAdviceCache = new Map<string, { data: any; expiresAt: number }>();
const MAX_PROFILE_ADVICE_CACHE_SIZE = 1000;
const geminiMinuteUsage = new Map<string, { count: number; resetAt: number }>();

function getGeminiClientKey(req: express.Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function enforceGeminiBudget(req: express.Request, res: express.Response, endpoint: string): boolean {
  const now = Date.now();
  const clientKey = getGeminiClientKey(req);
  const key = `${endpoint}:${clientKey}`;
  let usage = geminiUsage.get(key);
  let minuteUsage = geminiMinuteUsage.get(clientKey);

  if (!usage || usage.minuteResetAt <= now || usage.dayResetAt <= now) {
    usage = {
      minuteCount: 0,
      minuteResetAt: now + GEMINI_RATE_WINDOW_MS,
      dayCount: usage && usage.dayResetAt > now ? usage.dayCount : 0,
      dayResetAt: usage && usage.dayResetAt > now ? usage.dayResetAt : now + GEMINI_DAY_WINDOW_MS,
    };
    geminiUsage.set(key, usage);
  }
  if (!minuteUsage || minuteUsage.resetAt <= now) {
    minuteUsage = { count: 0, resetAt: now + GEMINI_RATE_WINDOW_MS };
    geminiMinuteUsage.set(clientKey, minuteUsage);
  }

  const dailyLimit = GEMINI_DAILY_LIMITS[endpoint] || 3;
  if (minuteUsage.count >= GEMINI_MAX_REQUESTS_PER_MINUTE) {
    res.status(429).json({ success: false, error: "Bạn đã đạt giới hạn lượt dùng AI trong một phút. Vui lòng thử lại sau." });
    return false;
  }
  if (usage.dayCount >= dailyLimit) {
    res.status(429).json({ success: false, error: "Bạn đã đạt giới hạn lượt dùng AI hôm nay. Vui lòng thử lại vào ngày mai." });
    return false;
  }

  minuteUsage.count += 1;
  usage.dayCount += 1;

  if (geminiUsage.size > MAX_GEMINI_USAGE_ENTRIES) {
    const oldestKey = geminiUsage.keys().next().value;
    if (oldestKey) geminiUsage.delete(oldestKey);
  }
  return true;
}

function readLimitedText(value: unknown, fieldName: string): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const text = value.trim();
  if (text.length > GEMINI_MAX_INPUT_CHARS) return null;
  return text;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, usage] of geminiUsage.entries()) {
    if (usage.dayResetAt <= now) geminiUsage.delete(key);
  }
  for (const [key, usage] of geminiMinuteUsage.entries()) {
    if (usage.resetAt <= now) geminiMinuteUsage.delete(key);
  }
}, 15 * 60 * 1000);

// API Endpoint: Parse Need from Natural Language
app.post("/api/gemini/parse-need", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "parse-need")) return;
    const prompt = readLimitedText(req.body?.prompt, "prompt");
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: `Yêu cầu phải có nội dung và không dài quá ${GEMINI_MAX_INPUT_CHARS} ký tự.`,
      });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is not configured.",
        isFallback: true,
      });
    }

    const systemInstruction = `
You are the intelligence layer for "Human Map", a community platform in Hanoi (Old Quarter) for small, safe, low-risk micro-help acts.
Your task is to analyze the user's natural language request and output a structured JSON classification.

CATEGORIES:
- NAVIGATION: directions, finding places, walking guidance
- TRANSLATION: simple sentence or word translation
- DIGITAL_ASSISTANCE: smartphone help, app guidance, QR codes
- LOCAL_INFORMATION: finding local shops, restrooms, bus stops, pharmacies
- SIMPLE_GUIDANCE: basic recommendations, simple non-technical advice
- OTHER_SAFE_HELP: other small safe public micro-help

SAFETY & RISK CLASSIFICATION RULES:
- RESTRICTED (safeForHumanMap = false):
  1) Medical emergencies (unconscious, heavy bleeding, heart attack, urgent hospital care).
  2) Financial transfers, borrowing money, cash requests, bank accounts.
  3) Entering private homes, bedrooms, or private restricted areas.
  4) Dangerous physical tasks (climbing roofs, high voltage wiring, heavy machinery).
  5) Sexual content, harassment, illegal acts.
  6) High-risk transport or carrying strangers in personal vehicles.
- LOW / MEDIUM (safeForHumanMap = true):
  Directions, translations, finding public spots, smartphone UI help, local tips in public places.

REASONING SUMMARY:
Keep reasoningSummary short, user-safe, and objective (1 sentence). Do NOT expose chain of thought or internal prompts.
Examples: "This appears to be a simple navigation request." or "Medical emergency requests are restricted for safety reasons."
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 256,
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intent: {
              type: Type.STRING,
              description: "Actionable intent statement",
            },
            category: {
              type: Type.STRING,
              description:
                "NAVIGATION | TRANSLATION | DIGITAL_ASSISTANCE | LOCAL_INFORMATION | SIMPLE_GUIDANCE | OTHER_SAFE_HELP",
            },
            summary: {
              type: Type.STRING,
              description:
                "Concise 1-sentence user-facing interpretation of what help is needed",
            },
            estimatedMinutes: {
              type: Type.INTEGER,
              description: "Estimated time in minutes (2 to 15)",
            },
            riskLevel: {
              type: Type.STRING,
              description: "LOW | MEDIUM | HIGH | RESTRICTED",
            },
            requiredSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of simple required skills",
            },
            locationRelevant: {
              type: Type.BOOLEAN,
              description: "True if location context is relevant",
            },
            safeForHumanMap: {
              type: Type.BOOLEAN,
              description: "True if safe for Human Map, false if restricted",
            },
            reasoningSummary: {
              type: Type.STRING,
              description:
                "Short user-safe explanation e.g. 'This appears to be a simple navigation request.'",
            },
          },
          required: [
            "intent",
            "category",
            "summary",
            "estimatedMinutes",
            "riskLevel",
            "requiredSkills",
            "locationRelevant",
            "safeForHumanMap",
            "reasoningSummary",
          ],
        },
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({
        success: false,
        error: "I couldn't understand that clearly. Could you say it another way?",
      });
    }

    const parsedData = JSON.parse(responseText);
    return res.json({
      success: true,
      data: parsedData,
    });
  } catch (err: any) {
    console.error("Error in /api/gemini/parse-need:", err);
    return res.status(500).json({
      success: false,
      error: "I couldn't understand that clearly. Could you say it another way?",
    });
  }
});

// API Endpoint: Classify Risk Only
app.post("/api/gemini/classify-risk", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "classify-risk")) return;
    const prompt = readLimitedText(req.body?.prompt, "prompt");
    if (!prompt) return res.status(400).json({ success: false, error: `Nội dung phải dài từ 1 đến ${GEMINI_MAX_INPUT_CHARS} ký tự.` });
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is not configured.",
        isFallback: true,
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 128,
        systemInstruction:
          "Analyze the user request for safety on a public micro-help app. Return riskLevel (LOW|MEDIUM|HIGH|RESTRICTED), safeForHumanMap (boolean), and reasoningSummary (short user-safe explanation). Money, medical emergency, private home entry, illegal acts are RESTRICTED.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            safeForHumanMap: { type: Type.BOOLEAN },
            reasoningSummary: { type: Type.STRING },
          },
          required: ["riskLevel", "safeForHumanMap", "reasoningSummary"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: "Error classifying risk.",
    });
  }
});

// API Endpoint: Generate Story Draft
app.post("/api/gemini/generate-story", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "generate-story")) return;
    const needTitle = readLimitedText(req.body?.needTitle, "needTitle");
    const locationName = readLimitedText(req.body?.locationName, "locationName");
    const requesterName = readLimitedText(req.body?.requesterName, "requesterName");
    const helperName = readLimitedText(req.body?.helperName, "helperName");
    if (!needTitle || !locationName || !requesterName || !helperName) {
      return res.status(400).json({ success: false, error: `Thông tin story không được trống hoặc dài quá ${GEMINI_MAX_INPUT_CHARS} ký tự.` });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is not configured.",
        isFallback: true,
      });
    }

    const prompt = `Write a short, heart-warming Vietnamese human story about helper ${helperName} helping ${requesterName} with "${needTitle}" at ${locationName}.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 256,
        systemInstruction: "You write inspiring short stories of human connection for Human Map in Hanoi Old Quarter.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            quote: { type: Type.STRING },
            body: { type: Type.STRING },
            theme: { type: Type.STRING },
          },
          required: ["title", "quote", "body", "theme"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to generate story" });
  }
});

// API Endpoint: Optimize Profile Bio & Skills with Gemini AI
app.post("/api/gemini/optimize-profile", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "optimize-profile")) return;
    const { name, role, currentBio, locationName, skills, totalHelpedCount } = req.body || {};
    if ([name, role, currentBio, locationName].some((value) => value !== undefined && typeof value !== "string")) {
      return res.status(400).json({ success: false, error: "Thông tin hồ sơ không hợp lệ." });
    }
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback response if API key is absent
      return res.json({
        success: true,
        data: {
          optimizedBio: `${name || 'Thành viên'} tích cực sống tại ${locationName || 'Phố Cổ, Hà Nội'}. Luôn sẵn lòng trợ giúp chỉ đường, chia sẻ thông tin địa phương, hỗ trợ điện thoại cho du khách và bà con xung quanh.`,
          suggestedSkills: ["Chỉ đường Phố Cổ", "Thông tin địa phương", "Dịch thuật tiếng Anh", "Hướng dẫn smartphone"],
          communityTagline: "Người bạn đồng hành ấm áp tại Hà Nội",
          aiImpactTip: "Thêm các kỹ năng am hiểu góc phố địa phương sẽ giúp bạn nhận được nhiều gợi ý trợ giúp phù hợp hơn!"
        }
      });
    }

    const prompt = `Bạn là trợ lý AI tối ưu hóa hồ sơ cộng đồng cho ứng dụng Human Map (Bản đồ Nhân ái tại Hà Nội).
Hãy tối ưu hóa Hồ sơ cho thành viên sau:
- Tên: ${name || 'Thành viên'}
- Vai trò: ${role || 'Người dân địa phương'}
- Vị trí/Địa bàn: ${locationName || 'Phố Cổ, Hà Nội'}
- Bio hiện tại: ${currentBio || 'Chưa có'}
- Kỹ năng hiện tại: ${Array.isArray(skills) ? skills.join(', ') : (skills || 'Chỉ đường, Giao tiếp')}
- Số lần đã trợ giúp: ${totalHelpedCount || 0} lần

Yêu cầu:
1. optimizedBio: Viết 1-2 câu giới thiệu bản thân ấm áp, chân thành, thể hiện sự nhiệt tình giúp đỡ cộng đồng địa phương (bằng tiếng Việt, tối đa 160 ký tự).
2. suggestedSkills: Mảng từ 3-5 kỹ năng micro-help hữu ích phù hợp địa bàn (ví dụ: "Chỉ đường Phố Cổ", "Hướng dẫn dùng smartphone", "Dịch thuật đơn giản", "Thông tin ẩm thực").
3. communityTagline: Danh hiệu ngắn độc đáo (4-7 từ) thể hiện tinh thần nhân ái.
4. aiImpactTip: Lời khuyên 1 câu giúp người dùng tăng thêm niềm tin và khả năng giúp đỡ.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 256,
        systemInstruction: "Bạn là trợ lý viết hồ sơ cá nhân truyền cảm hứng, ngắn gọn, ấm áp cho cộng đồng Human Map.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            optimizedBio: { type: Type.STRING },
            suggestedSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
            communityTagline: { type: Type.STRING },
            aiImpactTip: { type: Type.STRING },
          },
          required: ["optimizedBio", "suggestedSkills", "communityTagline", "aiImpactTip"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("Error in /api/gemini/optimize-profile:", err);
    return res.json({
      success: true,
      data: {
        optimizedBio: `Thành viên nhiệt thành tại khu vực Phố Cổ, Hà Nội. Luôn sẵn lòng trợ giúp chỉ đường, chia sẻ thông tin địa phương và đồng hành cùng người cần trợ giúp xung quanh.`,
        suggestedSkills: ["Chỉ đường Phố Cổ", "Thông tin địa phương", "Hỗ trợ công nghệ", "Giao tiếp tiếng Anh"],
        communityTagline: "Người kết nối ấm áp tại Hoàn Kiếm",
        aiImpactTip: "Cập nhật địa bàn sinh sống rõ ràng giúp những người xung quanh dễ dàng tìm thấy bạn hơn!"
      }
    });
  }
});

// API Endpoint: Gemini Profile Impact & Community Advice
app.post("/api/gemini/profile-advice", async (req, res) => {
  try {
    const { name, locationName, totalHelpedCount, skills, role } = req.body || {};
    const cacheKey = JSON.stringify({ name, locationName, totalHelpedCount, skills, role });
    const cachedAdvice = profileAdviceCache.get(cacheKey);
    if (cachedAdvice && cachedAdvice.expiresAt > Date.now()) return res.json({ success: true, data: cachedAdvice.data, cached: true });
    if (!enforceGeminiBudget(req, res, "profile-advice")) return;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        success: true,
        data: {
          impactTitle: "Sứ Giả Nhân Ái Địa Phương",
          insightSummary: `Cảm ơn ${name || 'bạn'} đã tạo dựng những khoảnh khắc ấm áp tại ${locationName || 'Hà Nội'}. Mỗi trợ giúp nhỏ đều thắp sáng niềm tin trong cộng đồng!`,
          topStrengths: ["Thái độ niềm nở & an toàn", "Am hiểu ngõ ngách địa phương", "Sẵn sàng hỗ trợ nhanh"],
          recommendedAction: "Bật chế độ Sẵn sàng giúp đỡ vào buổi chiều để hỗ trợ người cao tuổi hoặc khách du lịch quanh Hồ Gươm.",
          safetyAdvice: "Lưu ý luôn gặp gỡ ở nơi công cộng đông người và không nhận/chuyển tiền hộ."
        }
      });
    }

    const prompt = `Phân tích tác động cộng đồng và đưa ra lời khuyên nhân ái bằng Gemini AI cho thành viên:
- Tên: ${name || 'Bạn'}
- Vị trí: ${locationName || 'Phố Cổ, Hà Nội'}
- Số lần trợ giúp: ${totalHelpedCount || 0}
- Vai trò: ${role || 'Người dân'}
- Kỹ năng: ${Array.isArray(skills) ? skills.join(', ') : 'Chỉ đường, Hướng dẫn'}

Hãy tạo phân tích tiếng Việt ngắn gọn, giàu cảm hứng:
1. impactTitle: Danh hiệu hoặc cấp độ nhân ái (VD: "Đại Sứ Nhân Ái Phố Cổ", "Trụ Cột Kết Nối Xóm Giềng").
2. insightSummary: 2 câu tổng kết về giá trị đóng góp của họ.
3. topStrengths: Mảng 3 điểm mạnh nổi bật nhất dựa trên vị trí và kỹ năng.
4. recommendedAction: 1 gợi ý hành động micro-help cụ thể tiếp theo tại khu vực.
5. safetyAdvice: 1 lời khuyên an toàn micro-help ngắn gọn.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 256,
        systemInstruction: "Bạn là trợ lý đánh giá tác động xã hội và bảo mật an toàn cho Human Map.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            impactTitle: { type: Type.STRING },
            insightSummary: { type: Type.STRING },
            topStrengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendedAction: { type: Type.STRING },
            safetyAdvice: { type: Type.STRING },
          },
          required: ["impactTitle", "insightSummary", "topStrengths", "recommendedAction", "safetyAdvice"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    profileAdviceCache.set(cacheKey, { data: parsed, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    if (profileAdviceCache.size > MAX_PROFILE_ADVICE_CACHE_SIZE) {
      const oldestKey = profileAdviceCache.keys().next().value;
      if (oldestKey) profileAdviceCache.delete(oldestKey);
    }
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    return res.json({
      success: true,
      data: {
        impactTitle: "Thành Viên Nhân Ái Tin Cậy",
        insightSummary: "Những hành động nhỏ của bạn đóng góp trực tiếp vào sự gắn kết và an toàn của cộng đồng cư dân xung quanh.",
        topStrengths: ["Sẵn lòng chia sẻ", "Am hiểu địa phương", "Hỗ trợ an toàn"],
        recommendedAction: "Cập nhật thêm kỹ năng để nhận gợi ý kết nối chuẩn xác nhất.",
        safetyAdvice: "Luôn tuân thủ quy tắc ứng xử nơi công cộng."
      }
    });
  }
});

// API Endpoint: Generate Match Explanation
app.post("/api/gemini/match-explanation", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "match-explanation")) return;
    const { needTitle, helperName, helperDistance, helperSkills, completedHelps } = req.body || {};
    if (!readLimitedText(needTitle, "needTitle") || !readLimitedText(helperName, "helperName")) {
      return res.status(400).json({ success: false, error: `Thông tin ghép nối không được trống hoặc dài quá ${GEMINI_MAX_INPUT_CHARS} ký tự.` });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is not configured.",
        isFallback: true,
      });
    }

    const prompt = `Explain in 1 concise, user-friendly sentence why helper "${helperName}" (distance ${helperDistance}m, skills: ${helperSkills?.join(', ')}, completed helps: ${completedHelps}) is a suggested match for need "${needTitle}". Keep it natural and warm. Do not expose chain of thought.`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 128,
        systemInstruction: "You generate short 1-sentence product match explanations for Human Map app. Example: 'Minh is nearby, available now, and has helped with navigation several times.'",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            explanation: { type: Type.STRING },
          },
          required: ["explanation"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to generate match explanation" });
  }
});

// API Endpoint Phase 5: Generate Human Story
app.post("/api/gemini/generate-human-story", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "generate-human-story")) return;
    const { userReflection, needTitle, locationName, requesterName, helperName } = req.body || {};
    if ([userReflection, needTitle, locationName, requesterName, helperName].some((value) => value !== undefined && (typeof value !== "string" || value.length > GEMINI_MAX_INPUT_CHARS))) {
      return res.status(400).json({ success: false, error: `Nội dung story không được dài quá ${GEMINI_MAX_INPUT_CHARS} ký tự mỗi trường.` });
    }
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: "Gemini API key is not configured.",
        isFallback: true,
      });
    }

    const systemInstruction = `You are a human story generator for Human Map app in Hanoi.
Your mission is to polish and organize micro-help memories into warm, authentic, understated human stories.

STRICT HUMANITY & TRUTH RULES:
1. Do NOT fabricate events, quotes, emotions, ages, families, occupations, or facts.
2. AI can organize, summarize, and polish. AI MUST NOT INVENT.
3. QUOTE RULE: If the user provided a direct quote in their reflection (e.g., 'He said: I've lived here since 1986' or 'Bác ấy bảo: Tôi ở đây từ năm 1986'), you may use that exact quote or wording. If NO direct quote was provided by the user, leave the quote field empty string (""). NEVER invent fictitious quotation marks or fake quotes.
4. TONE: Warm, concise, authentic, understated, human. Avoid exaggerated emotional language, inspirational clichés, fake poetry, or dramatic storytelling.
5. PRIVACY: Never expose exact home addresses, phone numbers, or private contact details. Use general public location labels.

Return structured JSON with keys: title, summary, quote, body, theme, locationLabel, privacySuggestion.`;

    const userPrompt = `Context of help:
- Need / Task: ${needTitle || 'Hỗ trợ công cộng'}
- Location: ${locationName || 'Phố Cổ, Hoàn Kiếm'}
- Helper: ${helperName || 'Người giúp đỡ'}
- Person helped: ${requesterName || 'Người nhận trợ giúp'}

User Reflection / Memory:
"${userReflection || 'Hỗ trợ công cộng hoàn tất an toàn.'}"

Generate a polished human story adhering strictly to the non-invention and quote rules.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userPrompt,
      config: {
        maxOutputTokens: 512,
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            quote: { type: Type.STRING },
            body: { type: Type.STRING },
            theme: { type: Type.STRING },
            locationLabel: { type: Type.STRING },
            privacySuggestion: { type: Type.STRING },
          },
          required: ["title", "summary", "quote", "body", "theme", "locationLabel", "privacySuggestion"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err) {
    return res.status(500).json({ success: false, error: "Failed to generate human story" });
  }
});

// API Endpoint: Dynamic Story Theme Discovery & Clustering with Gemini
app.post("/api/gemini/extract-story-themes", async (req, res) => {
  try {
    if (!enforceGeminiBudget(req, res, "extract-story-themes")) return;
    const { stories } = req.body || {};
    const ai = getGeminiClient();

    if (!Array.isArray(stories) || stories.length === 0 || stories.length > 50 || JSON.stringify(stories).length > 20000) {
      return res.json({
        success: true,
        data: {
          themes: [],
          insight: "Chưa có câu chuyện nào để phân tích chủ đề.",
        },
      });
    }

    if (!ai) {
      // Local fallback theme grouping if Gemini API is unconfigured
      const themesMap: Record<string, number> = {};
      stories.forEach((s: any) => {
        const themeName = s.theme?.trim() || "Lòng tốt quanh ta";
        themesMap[themeName] = (themesMap[themeName] || 0) + 1;
      });

      const fallbackThemes = Object.entries(themesMap).map(([name, count]) => ({
        name,
        count,
        icon: name.includes("Kỷ niệm") ? "🏛️" : name.includes("Lòng tốt") ? "❤️" : "✨",
        description: `Các mẩu chuyện về ${name.toLowerCase()} do cư dân chia sẻ.`,
      }));

      return res.json({
        success: true,
        data: {
          themes: fallbackThemes,
          insight: "Chủ đề được tổng hợp trực tiếp từ các câu chuyện của cộng đồng.",
        },
      });
    }

    const storiesContext = stories
      .map(
        (s: any, idx: number) =>
          `[Story ${idx + 1}] Title: "${s.title}" | Quote: "${s.quote || ''}" | Body: "${s.body || ''}" | CurrentTheme: "${s.theme || ''}" | Location: "${s.locationName || ''}"`
      )
      .join("\n");

    const prompt = `Dưới đây là danh sách các câu chuyện thực tế được người dùng chia sẻ trên Human Map tại Hà Nội:
${storiesContext}

Hãy đọc kỹ nội dung, tiêu đề, trích dẫn và bối cảnh các câu chuyện trên để tự động phát hiện và phân cụm thành 3-5 CHỦ ĐỀ PHỔ BIẾN THỰC TẾ (Dynamic Popular Themes) xuất hiện nhiều nhất trong dữ liệu trên.
Yêu cầu:
1. Không dùng các chủ đề áp đặt cứng nhắc nếu dữ liệu không phản ánh. Hãy đặt tên chủ đề tự nhiên, ấm áp bằng tiếng Việt (VD: "Kỷ niệm Phố Cổ & Thời gian", "Chỉ đường & Gặp gỡ", "Ấm áp tình làng nghĩa xóm", "Hỗ trợ công nghệ & Du khách", "Ẩm thực & Quán xá").
2. Đếm số lượng câu chuyện (count) thuộc từng chủ đề.
3. Chọn icon emoji phù hợp cho từng chủ đề (VD: 🏛️, ❤️, 🧭, 📱, 🍜).
4. Viết 1 câu mô tả ngắn (description) cho từng chủ đề.
5. insight: 1 câu đúc kết cái nhìn chung về tinh thần gắn kết qua các câu chuyện này.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        maxOutputTokens: 512,
        systemInstruction: "Bạn là chuyên gia phân tích chủ đề cộng đồng và tâm lý xã hội học cho ứng dụng Human Map.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  count: { type: Type.INTEGER },
                  icon: { type: Type.STRING },
                  description: { type: Type.STRING },
                },
                required: ["name", "count", "icon", "description"],
              },
            },
            insight: { type: Type.STRING },
          },
          required: ["themes", "insight"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, data: parsed });
  } catch (err: any) {
    console.error("Error in /api/gemini/extract-story-themes:", err);
    return res.json({
      success: true,
      data: {
        themes: [
          { name: "Lòng tốt quanh ta", count: 1, icon: "❤️", description: "Hành động sẻ chia ấm áp" },
          { name: "Kỷ niệm phố cổ", count: 1, icon: "🏛️", description: "Ký ức gắn bó lâu năm" },
        ],
        insight: "Chủ đề tự động từ câu chuyện của cư dân.",
      },
    });
  }
});

// In-Memory Bounded Route Cache
interface RouteCacheEntry {
  data: any;
  expiresAt: number;
}
const routeCache = new Map<string, RouteCacheEntry>();
const MAX_ROUTE_CACHE_SIZE = 500;
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-Memory Bounded Rate Limiter
interface RateLimitEntry {
  count: number;
  resetAt: number;
}
const routeRateLimiter = new Map<string, RateLimitEntry>();
const MAX_RATE_LIMITER_MAP_SIZE = 1000;
const ROUTE_RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const ROUTE_RATE_LIMIT_MAX_REQUESTS = 30; // Max 30 requests per minute per IP

interface TokenVerifyResult {
  valid: boolean;
  uid?: string;
  errorCode?: "ROUTING_AUTH_REQUIRED" | "ROUTING_AUTH_INVALID" | "ROUTING_AUTH_EXPIRED";
  errorMessage?: string;
}

async function verifyFirebaseIdToken(authHeader: string | undefined): Promise<TokenVerifyResult> {
  if (!authHeader || !authHeader.trim()) {
    return {
      valid: false,
      errorCode: "ROUTING_AUTH_REQUIRED",
      errorMessage: "Yêu cầu đăng nhập để truy cập dịch vụ chỉ đường.",
    };
  }

  const parts = authHeader.trim().split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1]) {
    return {
      valid: false,
      errorCode: "ROUTING_AUTH_INVALID",
      errorMessage: "Mã xác thực không đúng định dạng.",
    };
  }

  const token = parts[1];
  const apiKey = process.env.API_KEY ||
    (firebaseAppletConfig.apiKey !== "API_KEY" ? firebaseAppletConfig.apiKey : "");

  if (!apiKey) {
    return {
      valid: false,
      errorCode: "ROUTING_AUTH_INVALID",
      errorMessage: "Cấu hình xác thực không khả dụng.",
    };
  }

  try {
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData?.error?.message || "";
      if (msg.includes("EXPIRED") || msg.includes("TOKEN_EXPIRED")) {
        return {
          valid: false,
          errorCode: "ROUTING_AUTH_EXPIRED",
          errorMessage: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        };
      }
      return {
        valid: false,
        errorCode: "ROUTING_AUTH_INVALID",
        errorMessage: "Mã xác thực không hợp lệ.",
      };
    }

    const data = await response.json();
    if (data.users && data.users.length > 0 && data.users[0].localId) {
      return {
        valid: true,
        uid: data.users[0].localId,
      };
    }

    return {
      valid: false,
      errorCode: "ROUTING_AUTH_INVALID",
      errorMessage: "Không tìm thấy người dùng phù hợp.",
    };
  } catch (err) {
    return {
      valid: false,
      errorCode: "ROUTING_AUTH_INVALID",
      errorMessage: "Xác thực không thành công.",
    };
  }
}

// Clean stale rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of routeRateLimiter.entries()) {
    if (entry.resetAt <= now) {
      routeRateLimiter.delete(ip);
    }
  }
}, 5 * 60 * 1000);

// API Endpoint: Real Road Routing Proxy (OSRM integration)
app.post("/api/route", async (req, res) => {
  try {
    // 1. Verify Authentication Token
    const authHeader = req.headers.authorization || (req.headers["authorization"] as string);
    const authResult = await verifyFirebaseIdToken(authHeader);

    if (!authResult.valid) {
      return res.status(401).json({
        success: false,
        errorCode: authResult.errorCode,
        error: authResult.errorMessage,
      });
    }

    // 2. Rate Limiting Check (per IP + UID)
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown_client";
    const rateLimitKey = `${clientIp}:${authResult.uid}`;
    const now = Date.now();
    let limitEntry = routeRateLimiter.get(rateLimitKey);

    if (!limitEntry || limitEntry.resetAt <= now) {
      limitEntry = { count: 1, resetAt: now + ROUTE_RATE_LIMIT_WINDOW_MS };
      if (routeRateLimiter.size >= MAX_RATE_LIMITER_MAP_SIZE) {
        const firstKey = routeRateLimiter.keys().next().value;
        if (firstKey) routeRateLimiter.delete(firstKey);
      }
      routeRateLimiter.set(rateLimitKey, limitEntry);
    } else {
      limitEntry.count += 1;
      if (limitEntry.count > ROUTE_RATE_LIMIT_MAX_REQUESTS) {
        return res.status(429).json({
          success: false,
          errorCode: "ROUTING_RATE_LIMITED",
          error: "Bạn đã gửi quá nhiều yêu cầu chỉ đường. Vui lòng thử lại sau 1 phút.",
        });
      }
    }

    const { origin, destination, mode = "walk" } = req.body;

    // Validate origin and destination coordinates
    if (
      !origin ||
      !destination ||
      typeof origin.lat !== "number" ||
      typeof origin.lng !== "number" ||
      typeof destination.lat !== "number" ||
      typeof destination.lng !== "number" ||
      isNaN(origin.lat) ||
      isNaN(origin.lng) ||
      isNaN(destination.lat) ||
      isNaN(destination.lng) ||
      Math.abs(origin.lat) > 90 ||
      Math.abs(origin.lng) > 180 ||
      Math.abs(destination.lat) > 90 ||
      Math.abs(destination.lng) > 180
    ) {
      return res.status(400).json({
        success: false,
        errorCode: "ROUTING_INVALID_REQUEST",
        error: "Vị trí không hợp lệ.",
      });
    }

    const validModes = ["walk", "bike", "drive"];
    if (!validModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        errorCode: "ROUTING_MODE_UNSUPPORTED",
        error: `Phương tiện ${mode} không được hỗ trợ.`,
      });
    }

    // Normalized cache key
    const cacheKey = `${mode}:${origin.lat.toFixed(5)},${origin.lng.toFixed(5)}->${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}`;

    const cached = routeCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return res.json({
        success: true,
        data: cached.data,
      });
    }

    // Map travel mode to OSRM profile
    let osrmProfile = "foot";
    if (mode === "bike") osrmProfile = "bike";
    if (mode === "drive") osrmProfile = "driving";

    // OSRM expects coordinates formatted as lng,lat;lng,lat
    const osrmUrl = `https://router.project-osrm.org/route/v1/${osrmProfile}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "HumanMap-RoutingProxy/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(503).json({
        success: false,
        errorCode: "ROUTING_UNAVAILABLE",
        error: "Không thể tính tuyến đường lúc này.",
      });
    }

    const osrmData = await response.json();
    if (osrmData.code !== "Ok" || !osrmData.routes || osrmData.routes.length === 0) {
      return res.status(503).json({
        success: false,
        errorCode: "ROUTING_UNAVAILABLE",
        error: "Không thể tính tuyến đường lúc này.",
      });
    }

    const primaryRoute = osrmData.routes[0];
    const distanceMeters = Math.round(primaryRoute.distance);
    const durationSeconds = Math.round(primaryRoute.duration);
    const estMinutes = Math.max(1, Math.round(durationSeconds / 60));

    // Convert GeoJSON geometry coordinates [[lng, lat], ...] to [[lat, lng], ...] for Leaflet
    const rawCoords = primaryRoute.geometry?.coordinates || [];
    const polyline: [number, number][] = rawCoords.map(([lng, lat]: [number, number]) => [lat, lng]);

    const routeResult = {
      distanceMeters,
      durationSeconds,
      estMinutes,
      polyline,
      mode,
      provider: `osrm-${osrmProfile}`,
      isRealRoadRoute: true,
      fetchedAt: Date.now(),
    };

    // Store in cache
    if (routeCache.size >= MAX_ROUTE_CACHE_SIZE) {
      const firstKey = routeCache.keys().next().value;
      if (firstKey) routeCache.delete(firstKey);
    }
    routeCache.set(cacheKey, {
      data: routeResult,
      expiresAt: now + ROUTE_CACHE_TTL_MS,
    });

    return res.json({
      success: true,
      data: routeResult,
    });
  } catch (err: any) {
    console.error("Error in /api/route endpoint:", err?.message || err);
    return res.status(503).json({
      success: false,
      errorCode: "ROUTING_UNAVAILABLE",
      error: "Không thể tính tuyến đường lúc này.",
    });
  }
});


// Start Server with Vite Middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Human Map Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
