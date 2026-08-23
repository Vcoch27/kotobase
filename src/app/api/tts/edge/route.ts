export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";

const EDGE_WS_URL = "wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EA6542D22E9F37B80C4212F5";

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
      default: return c;
    }
  });
}

function synthesizeEdgeTTS(
  text: string, 
  voice = "ja-JP-NanamiNeural", 
  rate = "0%", 
  pitch = "0Hz"
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const connectionId = crypto.randomUUID().replace(/-/g, "");
    const requestId = crypto.randomUUID().replace(/-/g, "");
    const wsUrl = `${EDGE_WS_URL}&ConnectionId=${connectionId}`;

    const ws = new WebSocket(wsUrl);
    const audioChunks: Uint8Array[] = [];
    let isFinished = false;

    const timeout = setTimeout(() => {
      if (!isFinished) {
        ws.close();
        reject(new Error("Edge TTS synthesis timed out"));
      }
    }, 12000);

    ws.onopen = () => {
      // 1. Config message
      const configMsg =
        `Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: "false",
                  wordBoundaryEnabled: "false",
                },
                outputFormat: "audio-24khz-48kbitrate-mono-mp3",
              },
            },
          },
        });
      ws.send(configMsg);

      // 2. SSML message
      const ssmlMsg =
        `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='ja-JP'>` +
        `<voice name='${voice}'>` +
        `<prosody rate='${rate}' pitch='${pitch}'>` +
        `${escapeXml(text)}` +
        `</prosody>` +
        `</voice>` +
        `</speak>`;
      ws.send(ssmlMsg);
    };

    ws.onmessage = async (event) => {
      const data = event.data;

      if (typeof data === "string") {
        if (data.includes("Path:turn.end")) {
          isFinished = true;
          clearTimeout(timeout);
          ws.close();
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
          const result = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioChunks) {
            result.set(chunk, offset);
            offset += chunk.length;
          }
          resolve(result);
        }
      } else if (data instanceof ArrayBuffer || data instanceof Blob) {
        let buffer: Uint8Array | null = null;
        if (data instanceof ArrayBuffer) {
          buffer = new Uint8Array(data);
        } else if (data instanceof Blob) {
          buffer = new Uint8Array(await data.arrayBuffer());
        }

        if (buffer && buffer.length >= 2) {
          const headerLength = (buffer[0] << 8) | buffer[1];
          if (buffer.length > 2 + headerLength) {
            const headerBytes = buffer.subarray(2, 2 + headerLength);
            const headerStr = new TextDecoder("utf-8").decode(headerBytes);
            if (headerStr.includes("Path:audio")) {
              const audioPayload = buffer.subarray(2 + headerLength);
              if (audioPayload.length > 0) {
                audioChunks.push(audioPayload);
              }
            }
          }
        }
      }
    };

    ws.onerror = (err) => {
      clearTimeout(timeout);
      reject(err);
    };

    ws.onclose = () => {
      clearTimeout(timeout);
      if (!isFinished && audioChunks.length > 0) {
        const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result);
      } else if (!isFinished) {
        reject(new Error("WebSocket closed before audio received"));
      }
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const voice = searchParams.get("voice") || "ja-JP-NanamiNeural";
  const rate = searchParams.get("rate") || "-5%";

  if (!text || !text.trim()) {
    return new NextResponse("Text is required", { status: 400 });
  }

  try {
    const audioBuffer = await synthesizeEdgeTTS(text.trim(), voice, rate);
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error: any) {
    console.error("Edge TTS error:", error);
    return new NextResponse(error.message || "Failed to synthesize audio", { status: 500 });
  }
}
