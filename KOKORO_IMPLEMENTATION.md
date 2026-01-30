# Kokoro TTS Implementation Guide

## Overview

This document explains how Kokoro TTS is implemented in the voice_Access project, copied from the Midnight-Pad implementation.

## Architecture

### 1. KokoroTTS Service (`src/services/KokoroTTS.ts`)

The core TTS engine wrapper that provides:

#### Features

- **WebGPU Support**: Tries WebGPU first for hardware acceleration
- **WASM Fallback**: Automatically falls back to WASM if WebGPU fails
- **fp32 Precision**: Uses full precision (fp32) instead of quantized (q8) for better audio quality
- **Queue Management**: Ensures sequential synthesis to prevent audio conflicts
- **Progress Tracking**: Provides initialization progress callbacks
- **54 Voices**: Supports 54 voices across 8 languages
- **Language Detection**: Automatically detects language from voice prefix

#### Supported Voices

- **American English (a)**: 20 voices (af_heart, af_bella, af_nicole, am_michael, etc.)
- **British English (b)**: 8 voices (bf_emma, bm_george, etc.)
- **Hindi (h)**: 8 voices (hf_alpha, hm_omega, etc.)
- **Japanese (j)**: 5 voices
- **Mandarin Chinese (z)**: 8 voices
- **Spanish (e)**: 3 voices
- **French (f)**: 1 voice
- **Italian (i)**: 2 voices
- **Portuguese (p)**: 3 voices

#### Key Methods

```typescript
// Initialize the TTS engine
await kokoroTTS.initialize((progress) => {
  console.log(`Loading: ${progress}%`);
});

// Synthesize speech
const { audio, sampling_rate } = await kokoroTTS.speak(
  "Hello world",
  "af_heart", // Optional voice, defaults to af_heart
);

// Check if ready
if (kokoroTTS.isReady()) {
  // Engine is ready to use
}
```

### 2. Resource Store (`src/stores/useResourceStore.ts`)

Manages TTS initialization and state:

```typescript
interface ResourceState {
  tts: KokoroTTS | null; // TTS instance
  isTTSInitializing: boolean; // Loading state
  ttsReady: boolean; // Ready state
  ttsProgress: number; // Loading progress (0-100)
  initTTS: () => Promise<void>; // Initialize function
}
```

#### Usage

```typescript
const { tts, ttsReady, ttsProgress, initTTS } = useResourceStore();

// Initialize TTS (typically in App.tsx)
useEffect(() => {
  initTTS();
}, []);
```

### 3. useTTS Hook (`src/hooks/useTTS.ts`)

React hook for easy TTS usage in components:

```typescript
const { speak, stop, isSpeaking, ready, progress } = useTTS();

// Speak text
await speak("Hello world", "af_sky");

// Stop speaking
stop();
```

## Implementation Details

### WebGPU vs WASM

The service tries WebGPU first for better performance:

```typescript
try {
  // Try WebGPU with fp32
  this.synthesizer = await NeuralKokoro.from_pretrained(
    "onnx-community/Kokoro-82M-v1.0-ONNX",
    { dtype: "fp32", device: "webgpu" },
  );
} catch (webgpuError) {
  // Fallback to WASM
  this.synthesizer = await NeuralKokoro.from_pretrained(
    "onnx-community/Kokoro-82M-v1.0-ONNX",
    { dtype: "fp32", device: "wasm" },
  );
}
```

### Queue Management

Prevents audio conflicts by queuing synthesis requests:

```typescript
private queue: Promise<any> = Promise.resolve();

async speak(text: string, voice: string) {
  const nextInQueue = this.queue.then(async () => {
    // Synthesis happens here
  });

  this.queue = nextInQueue.catch(() => {});
  return nextInQueue;
}
```

### Audio Playback

The useTTS hook handles audio playback using Web Audio API:

```typescript
const audioContext = new AudioContext();
const audioBuffer = audioContext.createBuffer(
  1,
  audioData.length,
  sampling_rate,
);
audioBuffer.getChannelData(0).set(audioData);

const source = audioContext.createBufferSource();
source.buffer = audioBuffer;
source.connect(audioContext.destination);
source.start();
```

## Differences from Midnight-Pad

### What Was Copied

✅ Complete KokoroTTS service class
✅ WebGPU/WASM fallback logic
✅ fp32 precision configuration
✅ Queue management
✅ Progress tracking
✅ All 54 voice support
✅ Language code detection

### What Was Adapted

🔄 Removed `@huggingface/transformers` dependency (not needed)
🔄 Simplified ONNX Runtime configuration
🔄 Integrated with existing resource store pattern
🔄 Updated useTTS hook to use new API

### What Was NOT Copied

❌ Voice service integration (VoiceRecognitionService, etc.)
❌ Wake word detection
❌ Voice command processing
❌ Voice feedback manager
❌ Voice responder

## Performance Optimizations

1. **Lazy Initialization**: TTS engine only initializes when needed
2. **Progress Tracking**: User can see loading progress
3. **Queue Management**: Prevents audio conflicts
4. **WebGPU Acceleration**: Uses GPU when available
5. **fp32 Precision**: Better audio quality than q8

## Usage Example

```typescript
import { useTTS } from './hooks/useTTS';

function MyComponent() {
  const { speak, isSpeaking, ready, progress } = useTTS();

  const handleSpeak = async () => {
    if (!ready) {
      console.log(`TTS loading: ${progress}%`);
      return;
    }

    await speak("Hello from Kokoro TTS!", "af_heart");
  };

  return (
    <button onClick={handleSpeak} disabled={!ready || isSpeaking}>
      {!ready ? `Loading ${progress}%` : isSpeaking ? 'Speaking...' : 'Speak'}
    </button>
  );
}
```

## Voice Selection Guide

### Recommended Voices

- **Premium Quality (Grade A)**: af_heart, af_bella
- **Professional (Grade B)**: af_nicole, bf_emma, ff_siwis
- **Good Quality (Grade C+)**: af_aoede, af_kore, af_sarah, am_fenrir, am_michael, am_puck

### Voice Naming Convention

- **Prefix**: Language code (a=American, b=British, h=Hindi, etc.)
- **Gender**: f=female, m=male
- **Name**: Descriptive name (heart, bella, nicole, etc.)

Example: `af_heart` = American (a) Female (f) Heart

## Troubleshooting

### TTS Not Initializing

- Check browser console for errors
- Ensure `initTTS()` is called in App.tsx
- Verify internet connection (first load downloads models)

### Poor Audio Quality

- Ensure fp32 is being used (check console logs)
- Try different voices
- Check if WebGPU is available

### Audio Conflicts

- The queue management should prevent this
- If issues persist, check if multiple TTS instances exist

## Future Enhancements

Potential improvements from Midnight-Pad that could be added:

1. Voice settings persistence
2. Voice feedback manager for system responses
3. Voice responder for AI responses
4. Integration with voice commands
5. Wake word detection
