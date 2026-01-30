import { KokoroTTS as NeuralKokoro } from 'kokoro-js';
import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime Web for Vite environment
const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

// Configure the underlying ORT environment
if (ort.env?.wasm) {
  ort.env.wasm.wasmPaths = `${baseUrl}/assets/onnx/`;
  ort.env.wasm.numThreads = 1;
}

export class KokoroTTS {
  private synthesizer: any = null;
  private isInitializing = false;
  private progressCallback: ((p: number) => void) | null = null;
  private queue: Promise<any> = Promise.resolve();

  private readonly VALID_VOICES = [
    'af_heart',
    'af_alloy',
    'af_aoede',
    'af_bella',
    'af_jessica',
    'af_kore',
    'af_nicole',
    'af_nova',
    'af_river',
    'af_sarah',
    'af_sky',
    'am_adam',
    'am_echo',
    'am_eric',
    'am_fenrir',
    'am_liam',
    'am_michael',
    'am_onyx',
    'am_puck',
    'am_santa',
    'bf_emma',
    'bf_isabella',
    'bm_george',
    'bm_lewis',
    'bf_alice',
    'bf_lily',
    'bm_daniel',
    'bm_fable',
    // Hindi
    'hf_alpha',
    'hf_beta',
    'hf_priya',
    'hf_anjali',
    'hm_omega',
    'hm_psi',
    'hm_arjun',
    'hm_raj',
  ];

  private getLanguageCode(voice: string): string {
    const prefix = voice.charAt(0).toLowerCase();
    const langMap: Record<string, string> = {
      a: 'a', // US English
      b: 'b', // UK English
      h: 'h', // Hindi
      j: 'j', // Japanese
      z: 'z', // Chinese
      e: 'e', // Spanish
      f: 'f', // French
      i: 'i', // Italian
      p: 'p', // Portuguese
    };
    return langMap[prefix] || 'a';
  }

  async initialize(onProgress?: (p: number) => void) {
    if (this.synthesizer) return;
    if (this.isInitializing) return;

    this.isInitializing = true;
    this.progressCallback = onProgress || null;

    try {
      console.log('[Kokoro-TTS] Initializing neural engine...');

      // Try WebGPU with fp32 first (better quality than q8)
      // If that fails, fallback to WASM
      try {
        this.synthesizer = await NeuralKokoro.from_pretrained(
          'onnx-community/Kokoro-82M-v1.0-ONNX',
          {
            dtype: 'fp32', // Full precision - prevents audio artifacts
            device: 'webgpu',
            progress_callback: (data: any) => {
              if (data.status === 'progress' && this.progressCallback) {
                this.progressCallback(data.progress);
              }
            },
          }
        );
        console.log('[Kokoro-TTS] Neural Engine Ready (WebGPU fp32).');
      } catch (webgpuError) {
        console.warn('[Kokoro-TTS] WebGPU failed, falling back to WASM:', webgpuError);
        this.synthesizer = await NeuralKokoro.from_pretrained(
          'onnx-community/Kokoro-82M-v1.0-ONNX',
          {
            dtype: 'fp32',
            device: 'wasm',
            progress_callback: (data: any) => {
              if (data.status === 'progress' && this.progressCallback) {
                this.progressCallback(data.progress);
              }
            },
          }
        );
        console.log('[Kokoro-TTS] Neural Engine Ready (WASM fp32).');
      }
    } catch (error) {
      console.error('[Kokoro-TTS] Initialization failed:', error);
      throw new Error(
        `Neural Engine Core Failure: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.isInitializing = false;
    }
  }

  async speak(
    text: string,
    voice: string = 'af_heart',
    speed: number = 1.0
  ): Promise<{ audio: Float32Array; sampling_rate: number }> {
    const voiceId = this.VALID_VOICES.includes(voice) ? voice : 'af_heart';

    const nextInQueue = this.queue.then(async () => {
      try {
        if (!this.synthesizer) {
          await this.initialize();
        }

        const start = performance.now();
        console.log(`[Kokoro-TTS] Synthesizing [${voiceId}] at ${speed}x: "${text.substring(0, 30)}..."`);

        const langCode = this.getLanguageCode(voiceId);
        const output = await this.synthesizer.generate(text + ' ', {
          voice: voiceId,
          language: langCode,
          speed: speed,
        });

        const duration = (performance.now() - start).toFixed(0);
        console.log(`[Kokoro-TTS] Synthesis complete in ${duration}ms`);

        if (!output || !output.audio) {
          throw new Error('Synthesis failed - no audio generated');
        }

        return {
          audio: output.audio,
          sampling_rate: 24000, // Kokoro standard
        };
      } catch (error) {
        console.error('[Kokoro-TTS] Synthesis error:', error);
        throw error;
      }
    });

    this.queue = nextInQueue.catch(() => {});
    return nextInQueue;
  }

  isReady(): boolean {
    return !!this.synthesizer;
  }
}

export const kokoroTTS = new KokoroTTS();
