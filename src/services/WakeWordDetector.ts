/**
 * Simple Wake Word Detector using Web Speech API
 * Listens for: "jarvis", "meera" (mira), "ghost", "computer"
 */

export type WakeWord = 'jarvis' | 'meera' | 'ghost' | 'computer';

export interface WakeWordDetectionResult {
  detected: boolean;
  wakeWord?: WakeWord;
  confidence: number;
  timestamp: number;
}

export class SimpleWakeWordDetector {
  private recognition: any; // SpeechRecognition
  private isListening = false;
  private isStarting = false;
  private isActuallyRunning = false;
  private enabledWakeWords: WakeWord[] = ['jarvis', 'meera', 'ghost', 'computer'];
  private detectionCallback: ((result: WakeWordDetectionResult) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;
  private lastDetectionTime = 0;
  private readonly DETECTION_COOLDOWN_MS = 1500;
  private restartTimeout: any = null;

  constructor() {
    // Initialize Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      throw new Error('Speech Recognition not supported in this browser');
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 3;

    this.recognition.onstart = () => {
        console.log('[WakeWordDetector] 🔊 Listening for wake word...');
        this.isActuallyRunning = true;
        this.isStarting = false;
    };
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.recognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];
      
      for (let i = 0; i < lastResult.length; i++) {
        const transcript = lastResult[i].transcript.toLowerCase().trim();
        const confidence = lastResult[i].confidence || 0.0;
        const isFinal = lastResult[i].isFinal;
        
        // VIGILANT LOGGING: Log everything heard to prove the mic is working
        if (transcript.length > 0) {
          console.debug(`[WakeWordDetector] 🎤 Activity: "${transcript}" (${(confidence * 100).toFixed(0)}%) ${isFinal ? '[FINAL]' : '[INTERIM]'}`);
        }
        
        this.checkForWakeWord(transcript, confidence);
      }
    };

    this.recognition.onerror = (event: any) => {
      const error = (event as any).error;
      
      // Filter out noisy/non-terminal errors
      if (error === 'no-speech' || error === 'aborted') {
        return;
      }

      console.error('[WakeWordDetector] ❌ Error:', error);
      
      // Clear any pending restart
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      
      if (error === 'not-allowed') {
        console.error('[WakeWordDetector] Mic permission denied');
        this.isListening = false;
      }
      
      this.errorCallback?.(new Error(error));
    };

    this.recognition.onend = () => {
      this.isActuallyRunning = false;
      this.isStarting = false;
      console.log('[WakeWordDetector] 💤 Recognition ended');

      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout);
        this.restartTimeout = null;
      }
      
      // Auto-restart if we're supposed to be listening
      if (this.isListening) {
        console.debug('[WakeWordDetector] Auto-restarting...');
        this.restartTimeout = setTimeout(() => {
          try {
            if (this.isListening) {
              this.recognition.start();
            }
          } catch (error) {
            console.error('[WakeWordDetector] Restart attempt failed:', error);
          }
        }, 300);
      }
    };
  }

  private checkForWakeWord(transcript: string, confidence: number): void {
    // Check cooldown
    if (Date.now() - this.lastDetectionTime < this.DETECTION_COOLDOWN_MS) {
      return;
    }

    // Normalize transcript
    const normalized = transcript.toLowerCase().trim();
    
    // Check each wake word
    for (const wakeWord of this.enabledWakeWords) {
      const variations = this.getWakeWordVariations(wakeWord);
      
      for (const variation of variations) {
        if (normalized.includes(variation)) {
          this.handleDetection(wakeWord, confidence);
          return;
        }
      }
    }
  }

  private getWakeWordVariations(wakeWord: WakeWord): string[] {
    const variations: Record<WakeWord, string[]> = {
      'jarvis': ['jarvis', 'jar vis', 'jarvas'],
      'meera': ['meera', 'mira', 'mera', 'mirror'],
      'ghost': ['ghost', 'goat', 'coast'],
      'computer': ['computer', 'compute', 'hey computer', 'ok computer'],
    };

    return variations[wakeWord] || [wakeWord];
  }

  private handleDetection(word: WakeWord, confidence: number): void {
    const now = Date.now();
    this.lastDetectionTime = now;

    console.log(`[WakeWordDetector] DETECTED: ${word} (${(confidence * 100).toFixed(1)}%)`);

    if (this.detectionCallback) {
      this.detectionCallback({
        detected: true,
        wakeWord: word,
        confidence,
        timestamp: now,
      });
    }
  }

  setEnabledWakeWords(wakeWords: WakeWord[]): void {
    this.enabledWakeWords = wakeWords;
  }

  public async start(wakeWords: WakeWord[]): Promise<void> {
    if (this.isActuallyRunning) {
      console.debug('[WakeWordDetector] Already running, skipping start');
      return;
    }

    this.enabledWakeWords = wakeWords;
    this.isListening = true;
    this.isStarting = true;

    console.log('[WakeWordDetector] 🚀 Starting logic for:', wakeWords);

    try {
      // Force kill any previous hanging session
      try {
        this.recognition.abort();
      } catch (e) {}

      // Reset state properties before starting
      this.isActuallyRunning = false;
      
      // Attempt start
      this.recognition.start();
      
      // Start a "starting-timeout" to prevent getting stuck in isStarting=true
      setTimeout(() => {
        if (this.isStarting && !this.isActuallyRunning) {
          console.warn('[WakeWordDetector] Start timed out. Forcing state reset.');
          this.isStarting = false;
        }
      }, 5000);

    } catch (error: any) {
      if (error.message?.includes('already started')) {
        console.warn('[WakeWordDetector] OS reports already started');
        this.isActuallyRunning = true;
      } else {
        console.error('[WakeWordDetector] Critical Start Failure:', error);
        this.isListening = false;
      }
      this.isStarting = false;
    }
  }

  stop(reason: string = 'manual'): void {
    if (!this.isListening) return;

    this.isListening = false;
    try {
      this.recognition.stop();
      console.log(`[WakeWordDetector] Stopped (Reason: ${reason})`);
    } catch (error) {
      console.error('[WakeWordDetector] Stop failed:', error);
    }
  }

  pause(): void {
    this.isListening = false;
  }

  resume(): void {
    this.isListening = true;
  }

  onDetection(callback: (result: WakeWordDetectionResult) => void): void {
    this.detectionCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  destroy(): void {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }
    this.stop('destroy');
    this.detectionCallback = null;
    this.errorCallback = null;
  }
}
