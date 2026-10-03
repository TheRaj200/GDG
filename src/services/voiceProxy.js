import { WebSocketServer } from 'ws';
import { parse } from 'url';
import { GoogleGenAI } from '@google/genai';
import { ENV } from '../config/env.js';
import { validateSessionId } from '../middlewares/sessionAuth.js';
import { farmService } from './farmService.js';
import { comparisonService } from './comparisonService.js';
import { planService } from './planService.js';

const wss = new WebSocketServer({ noServer: true });

export function initWebSocketProxy(server) {
  server.on('upgrade', async (request, socket, head) => {
    const { pathname, query } = parse(request.url || '', true);

    if (pathname === '/api/voice/gemini-stream') {
      const origin = request.headers.origin;
      if (ENV.FRONTEND_ORIGIN && ENV.FRONTEND_ORIGIN !== '*' && origin && origin !== ENV.FRONTEND_ORIGIN) {
        console.warn(`[VoiceProxy] Rejected WebSocket upgrade from unauthorized origin: ${origin}`);
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
        socket.destroy();
        return;
      }

      const rawSessionId = query.sessionId || request.headers['x-session-id'] ||
        (request.headers['authorization']?.startsWith('Bearer ') ? request.headers['authorization'].slice(7) : null);

      if (!rawSessionId) {
        console.warn('[VoiceProxy] WebSocket upgrade rejected: Missing session credential.');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      const validSession = await validateSessionId(String(rawSessionId));
      if (!validSession) {
        console.warn(`[VoiceProxy] WebSocket upgrade rejected: Invalid session credential "${rawSessionId}".`);
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.sessionId = String(validSession.sessionId || rawSessionId);
        wss.emit('connection', ws, request);
      });
    }
  });
}

import { mandiService } from './mandiService.js';

function buildKisanVoiceInstructions(profile = {}, activePlan = null) {
  let contextSnippet = `Farmer Profile: Area: ${profile.totalArea ? `${profile.totalArea} ${profile.areaUnit}` : 'Not shared'}, District: ${profile.district || 'Not shared'}, Water: ${profile.waterAvailability || 'Not shared'}, Sowing: ${profile.intendedSowingDate || 'Not shared'}, Budget: ${profile.budget ? `₹${profile.budget}` : 'Not shared'}.`;
  if (activePlan) {
    contextSnippet += ` Active Saved Plan: ${activePlan.cropNameHindi} (${activePlan.area} ${activePlan.areaUnit}), Net return: ₹${activePlan.financials?.netReturn || 0}.`;
  }

  const nextQ = farmService.getNextQuestion(profile);
  let greetingMsg = 'Ram-ram kisan bhai! Main Kisan Ai hoon. ';
  if (nextQ) {
    greetingMsg += nextQ.questionHindi;
  } else if (activePlan) {
    greetingMsg += `Aapki ${activePlan.cropNameHindi} ki yojana taiyar hai. Aaj kya janna chahte hain?`;
  } else {
    greetingMsg += 'Aapke khet ke liye fasal tulna dekhne ke liye taiyar hain. Batayein.';
  }

  return `You are "Kisan Ai", a warm, knowledgeable agricultural expert and Krishi Mitra in Madhya Pradesh.
You speak naturally via real-time two-way voice in short, friendly conversational Hinglish (Hindi words written in Latin/English letters).

CURRENT CONTEXT:
${contextSnippet}

GREETING:
Start with: "${greetingMsg}"

STRICT BEHAVIOR RULES:
1. Speak in friendly, natural conversational Hinglish (Latin letters).
2. Keep spoken responses SHORT (1-2 sentences maximum per turn) so conversation flows naturally like a phone call.
3. NEVER make bullet points, markdown symbols, or long lists in voice output.
4. When the farmer provides farm details (e.g. area, unit, water, sowing time, budget, village), call the "updateFarmProfile" tool immediately to persist it.
5. When the farmer asks for crop recommendations, comparison, or profit analysis for Wheat (Gehun), Chickpea (Chana), or Mustard (Sarson), call the "getCropComparison" tool.
6. When the farmer confirms their chosen crop, call the "selectCropPlan" tool. Say "Aapka plan save ho gaya hai" ONLY AFTER the selectCropPlan tool returns success.
7. If the farmer wants to sell crops or asks for market prices (e.g. "Mere paas 400 quintal gehu hai, kahan bechu?", "Mandi bhav kya chal raha hai?"), call the "getMandiAdvice" tool immediately.
8. Always use backend calculated financials — never invent financial math or yields.
`;
}

// Declared agricultural voice tools for Gemini Live config schema format
const voiceTools = [
  {
    name: 'updateFarmProfile',
    description: 'Update the farmer profile details with confirmed land area, unit (Acre/Bigha/Hectare), irrigation/water availability, sowing date, previous crop, village or budget.',
    parameters: {
      type: 'OBJECT',
      properties: {
        totalArea: { type: 'NUMBER', description: 'Total land area (e.g. 5, 2.5)' },
        areaUnit: { type: 'STRING', description: 'Unit: Acre, Bigha, or Hectare' },
        village: { type: 'STRING', description: 'Farmer village name' },
        district: { type: 'STRING', description: 'Farmer district or state name (e.g. Pune, Gwalior, Jaipur, Patna)' },
        waterAvailability: { type: 'STRING', description: 'Paryapt (3-4 Sinchai), Seemit (1-2 Sinchai), or Asinchit' },
        intendedSowingDate: { type: 'STRING', description: 'Sowing date or window (e.g. 15-30 November)' },
        previousCrop: { type: 'STRING', description: 'Previous crop (e.g. Soybean, Paddy, Khet Khali Tha)' },
        budget: { type: 'NUMBER', description: 'Estimated budget in INR' }
      }
    }
  },
  {
    name: 'getCropComparison',
    description: 'Fetch calculated crop comparison, suitability analysis, and net profit scenarios for Rabi crops (Wheat, Chickpea, Mustard) based on live weather and market data.',
    parameters: {
      type: 'OBJECT',
      properties: {
        reason: { type: 'STRING', description: 'Reason for comparison request' }
      }
    }
  },
  {
    name: 'selectCropPlan',
    description: 'Save and finalize the selected crop plan (Wheat/Gehun, Chickpea/Chana, or Mustard/Sarson) in the database after the farmer decides.',
    parameters: {
      type: 'OBJECT',
      properties: {
        cropKey: { type: 'STRING', description: 'Crop key: wheat, chickpea, or mustard' },
        scenario: { type: 'STRING', description: 'Scenario: low, base, or high' }
      },
      required: ['cropKey']
    }
  },
  {
    name: 'getMandiAdvice',
    description: 'Get real-time Mandi selling advice, nearby APMC market prices, transport costs, and net sale receipts for selling a crop quantity.',
    parameters: {
      type: 'OBJECT',
      properties: {
        crop: { type: 'STRING', description: 'Crop name: gehu/wheat, chana/gram, sarson/mustard, soybean, makka, pyaz, aloo, tamatar' },
        quantityQuintals: { type: 'NUMBER', description: 'Quantity to sell in quintals' },
        origin: { type: 'STRING', description: 'Farmer village, city, or district name (e.g. Pune, Gwalior, Dabra, Indore, Jaipur)' }
      },
      required: ['crop', 'quantityQuintals']
    }
  }
];

async function executeVoiceTool(sessionId, name, args) {
  try {
    console.log(`🌾 Voice Proxy Tool Executing: ${name} | session: ${sessionId} | args:`, args);

    if (name === 'updateFarmProfile') {
      const sanitizedArgs = {};
      if (args.totalArea !== undefined && args.totalArea > 0) sanitizedArgs.totalArea = Number(args.totalArea);
      if (args.areaUnit) sanitizedArgs.areaUnit = String(args.areaUnit);
      if (args.village) sanitizedArgs.village = String(args.village);
      if (args.district) sanitizedArgs.district = String(args.district);
      if (args.waterAvailability) sanitizedArgs.waterAvailability = String(args.waterAvailability);
      if (args.intendedSowingDate) sanitizedArgs.intendedSowingDate = String(args.intendedSowingDate);
      if (args.previousCrop) sanitizedArgs.previousCrop = String(args.previousCrop);
      if (args.budget !== undefined && args.budget > 0) sanitizedArgs.budget = Number(args.budget);

      const updated = await farmService.updateProfileManual(sessionId, sanitizedArgs);
      const nextQuestion = farmService.getNextQuestion(updated);

      return {
        success: true,
        message: 'Farm profile jaankari update ho gayi.',
        profile: updated,
        nextQuestion,
      };
    }

    if (name === 'getCropComparison') {
      const comp = await comparisonService.compareCrops(sessionId);
      if (!comp.supported) {
        return { success: false, message: comp.messageHindi };
      }
      if (!comp.comparisons || comp.comparisons.length === 0) {
        return { success: false, message: comp.messageHindi || 'Pehle zameen ka rakba darj karein.' };
      }

      const summary = comp.comparisons.map(c => `${c.nameHindi}: Net profit lagbhag ₹${c.scenarios.base.netReturn.toLocaleString('en-IN')}`).join(', ');
      return {
        success: true,
        summary,
        aiExplanation: comp.aiExplanationHindi,
        comparisons: comp.comparisons,
      };
    }

    if (name === 'selectCropPlan') {
      const plan = await planService.selectAndCreatePlan(sessionId, args.cropKey, args.scenario || 'base');
      return {
        success: true,
        message: `${plan.cropNameHindi} ki yojana safaltapoorvak database mein save ho gayi. Kul anumanit munafa ₹${plan.financials.netReturn.toLocaleString('en-IN')} hai.`,
        plan,
      };
    }

    if (name === 'getMandiAdvice') {
      const profile = await farmService.getProfile(sessionId);
      const origin = args.origin || profile.district || 'Gwalior';
      const advice = await mandiService.getBestMandis({
        crop: args.crop,
        quantityQuintals: args.quantityQuintals,
        origin,
      });

      return {
        success: advice.success,
        summary: advice.summaryHindi || advice.error,
        mandiAdvice: advice,
      };
    }

    return { success: false, error: 'Unknown agricultural tool.' };
  } catch (err) {
    console.error(`Voice Tool execution error [${name}]:`, err.message);
    return { success: false, error: err.message };
  }
}

wss.on('connection', async (ws) => {
  const sessionId = ws.sessionId;
  const apiKey = ENV.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('💥 GEMINI_API_KEY is not defined in environment variables.');
    ws.close(1011, 'GEMINI_API_KEY not configured');
    return;
  }

  const liveModel = ENV.GEMINI_LIVE_MODEL || 'gemini-2.5-flash';
  const voiceName = ENV.GEMINI_VOICE || 'Aoede';

  console.log(`🎙️ Kisan Voice Proxy Connected | Session: ${sessionId} | Live Model: ${liveModel} | Voice: ${voiceName}`);

  let isClosed = false;
  let geminiSession = null;

  let currentToolCallBlockId = 0;
  const toolCallBlockInterrupted = new Set();
  const speechInterruptedBlocks = new Set();

  const closeConnections = (code, reason) => {
    if (isClosed) return;
    isClosed = true;
    console.log(`🎙️ Kisan Voice Proxy Closed | Session: ${sessionId} | Code: ${code} | Reason: ${reason}`);
    try {
      ws.close(code, reason);
    } catch (_) {}
    if (geminiSession) {
      try {
        geminiSession.close();
      } catch (_) {}
    }
  };

  ws.on('close', (code, reason) => {
    closeConnections(code, reason?.toString() || '');
  });

  ws.on('error', (err) => {
    console.error(`🎙️ Voice Proxy socket error | Session: ${sessionId}:`, err.message);
    closeConnections(1011, err.message);
  });

  try {
    const profile = await farmService.getProfile(sessionId);
    const activePlan = await planService.getActivePlan(sessionId);

    const ai = new GoogleGenAI({ apiKey });

    const setupMsg = {
      model: liveModel,
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
      systemInstruction: {
        parts: [{ text: buildKisanVoiceInstructions(profile, activePlan) }],
      },
      tools: [{ functionDeclarations: voiceTools }],
      outputAudioTranscription: {},
      inputAudioTranscription: {},
    };

    geminiSession = await ai.live.connect({
      model: liveModel,
      config: setupMsg,
      callbacks: {
        onopen: () => {
          console.log(`🚀 Connected to Gemini Live SDK Stream | Session: ${sessionId}`);
          ws.send(JSON.stringify({ type: 'connected', sessionId }));
        },
        onmessage: async (payload) => {
          try {
            // Logs to diagnose Gemini Live events
            if (payload.serverContent?.inputTranscription?.text) {
              console.log(`🎙️ Farmer Speech Transcribed: "${payload.serverContent.inputTranscription.text}"`);
            }
            if (payload.serverContent?.modelTurn?.parts) {
              const textPart = payload.serverContent.modelTurn.parts.map(p => p.text || '').join('');
              if (textPart) {
                console.log(`🤖 Kisan Ai Spoken: "${textPart}"`);
              }
            }

            // Check for client interruption
            if (payload.serverContent?.interrupted) {
              toolCallBlockInterrupted.add(currentToolCallBlockId);
              speechInterruptedBlocks.add(currentToolCallBlockId);
            }

            // Check for tool/function calls
            if (payload.toolCall?.functionCalls) {
              const functionCalls = payload.toolCall.functionCalls;
              const blockId = ++currentToolCallBlockId;

              ws.send(JSON.stringify({
                type: 'toolCallStarted',
                functionCalls: functionCalls.map(f => ({ name: f.name, id: f.id })),
              }));

              const responses = [];
              for (const fCall of functionCalls) {
                if (toolCallBlockInterrupted.has(blockId)) {
                  responses.push({
                    name: fCall.name,
                    id: fCall.id,
                    response: { output: { error: 'Action cancelled by user' } },
                  });
                  break;
                }

                const result = await executeVoiceTool(sessionId, fCall.name, fCall.args || {});
                responses.push({
                  name: fCall.name,
                  id: fCall.id,
                  response: { output: result },
                });

                if (!toolCallBlockInterrupted.has(blockId)) {
                  ws.send(JSON.stringify({
                    type: 'toolCallExecuted',
                    name: fCall.name,
                    callId: fCall.id,
                    result,
                    profile: result?.profile,
                    nextQuestion: result?.nextQuestion,
                    plan: result?.plan,
                    comparisons: result?.comparisons,
                  }));
                }
              }

              if (!speechInterruptedBlocks.has(blockId)) {
                geminiSession.sendToolResponse({
                  functionResponses: responses,
                });
              } else {
                speechInterruptedBlocks.delete(blockId);
                toolCallBlockInterrupted.delete(blockId);
              }
              return;
            }

            // Forward Gemini message payloads to React client
            ws.send(JSON.stringify(payload));
          } catch (err) {
            console.error('Error handling message from Gemini Live:', err.message);
          }
        },
        onclose: (e) => {
          closeConnections(e.code || 1000, e.reason || 'Gemini Live stream closed');
        },
        onerror: (err) => {
          console.error(`Gemini stream error | Session: ${sessionId}:`, err.message);
          closeConnections(1011, err.message);
        },
      },
    });

    // Handle incoming client messages streamed from React frontend
    ws.on('message', (data) => {
      if (isClosed || !geminiSession) return;
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.type === 'cancelPendingTool') {
          const blockId = Number(parsed.blockId);
          toolCallBlockInterrupted.add(blockId);
          return;
        }

        if (parsed.clientContent) {
          geminiSession.sendClientContent(parsed.clientContent);
        } else if (parsed.realtimeInput) {
          if (!ws.chunkCount) ws.chunkCount = 0;
          ws.chunkCount++;
          if (ws.chunkCount % 40 === 0) {
            console.log(`🎙️ Forwarded audio input frames to Gemini: ${ws.chunkCount}`);
          }
          geminiSession.sendRealtimeInput(parsed.realtimeInput);
        } else if (parsed.toolResponse) {
          geminiSession.sendToolResponse(parsed.toolResponse);
        }
      } catch (_) {
        // Forward base64 encoded audio chunk directly
        try {
          geminiSession.sendRealtimeInput({
            audio: {
              mimeType: 'audio/pcm;rate=16000',
              data: data.toString(),
            },
          });
        } catch (err) {
          console.error('Error forwarding raw audio chunk:', err.message);
        }
      }
    });

  } catch (err) {
    console.error(`🎙️ Voice session boot failed | Session: ${sessionId}:`, err.message);
    closeConnections(1011, 'Voice session connection failed');
  }
});
