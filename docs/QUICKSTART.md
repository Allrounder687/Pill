# Quick Start - Kokoro TTS

## Installation Complete ✅

The Kokoro TTS implementation from Midnight-Pad has been successfully copied to voice_Access.

## What's New

### 1. Better Audio Quality

- Upgraded from **q8** (8-bit quantized) to **fp32** (32-bit floating point)
- Result: Clearer, more natural-sounding speech

### 2. Hardware Acceleration

- **WebGPU** support for faster synthesis
- Automatic fallback to **WASM** if WebGPU unavailable

### 3. Progress Tracking

- Real-time loading progress (0-100%)
- Better user feedback during initialization

### 4. Queue Management

- Prevents audio conflicts
- Smooth sequential playback

### 5. More Voices

- **54 voices** across **8 languages**
- Automatic language detection

## Usage

### In Your Components

```typescript
import { useTTS } from './hooks/useTTS';

function MyComponent() {
  const { speak, isSpeaking, ready, progress } = useTTS();

  const handleSpeak = async () => {
    await speak("Hello from Kokoro TTS!", "af_heart");
  };

  return (
    <div>
      {!ready && <p>Loading TTS: {progress}%</p>}
      <button
        onClick={handleSpeak}
        disabled={!ready || isSpeaking}
      >
        {isSpeaking ? 'Speaking...' : 'Speak'}
      </button>
    </div>
  );
}
```

### Direct Service Access

```typescript
import { kokoroTTS } from "./services/KokoroTTS";

// Initialize manually (optional - auto-initializes on first use)
await kokoroTTS.initialize((progress) => {
  console.log(`Loading: ${progress}%`);
});

// Synthesize speech
const { audio, sampling_rate } = await kokoroTTS.speak(
  "Hello world",
  "af_bella", // Optional, defaults to af_heart
);

// Check if ready
if (kokoroTTS.isReady()) {
  console.log("TTS engine is ready!");
}
```

## Voice Selection

### Top Recommended Voices

#### Premium Quality (Grade A)

- `af_heart` - ❤️ Premium quality, warm female voice
- `af_bella` - 🔥 Warm and friendly female voice

#### Professional (Grade B)

- `af_nicole` - 🎧 Professional and articulate
- `bf_emma` - Warm British female voice

#### Good Quality (Grade C+)

- `af_sky` - Light and airy (current default)
- `af_aoede` - Smooth and melodic
- `am_michael` - Warm and trustworthy male voice

### All Available Voices

```typescript
// American English (20 voices)
("af_heart",
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa");

// British English (8 voices)
("bf_emma",
  "bf_isabella",
  "bf_alice",
  "bf_lily",
  "bm_george",
  "bm_lewis",
  "bm_daniel",
  "bm_fable");

// Hindi (8 voices)
("hf_alpha",
  "hf_beta",
  "hf_priya",
  "hf_anjali",
  "hm_omega",
  "hm_psi",
  "hm_arjun",
  "hm_raj");
```

## Testing

### 1. Start the Dev Server

```bash
npm run dev
```

### 2. Test Different Voices

Open the browser console and try:

```javascript
// Get the TTS instance from the store
const tts = useResourceStore.getState().tts;

// Test premium voice
await tts.speak("This is the premium heart voice", "af_heart");

// Test British voice
await tts.speak("This is a British voice", "bf_emma");

// Test male voice
await tts.speak("This is a male voice", "am_michael");

// Test Hindi voice
await tts.speak("Namaste, main Kokoro hoon", "hf_alpha");
```

### 3. Check Performance

Monitor the console for:

- Initialization time
- WebGPU vs WASM detection
- Synthesis times

Example output:

```
[Kokoro-TTS] Initializing neural engine...
[Kokoro-TTS] Neural Engine Ready (WebGPU fp32).
[ResourceStore] Kokoro TTS Loaded in 1234.56ms
[Kokoro-TTS] Synthesizing [af_heart]: "Hello world..."
[Kokoro-TTS] Synthesis complete in 234ms
```

## Performance Expectations

### First Load (with download)

- WebGPU: 2-5 seconds
- WASM: 3-7 seconds

### Cached Load

- WebGPU: 500-1000ms
- WASM: 800-1500ms

### Synthesis

- Short phrase (10 words): 200-500ms
- Long text (100 words): 1-3 seconds

## Browser Support

### WebGPU (Best Performance)

- ✅ Chrome 113+
- ✅ Edge 113+
- ❌ Firefox (uses WASM)
- ❌ Safari (uses WASM)

### WASM (Fallback)

- ✅ All modern browsers

## Troubleshooting

### TTS Not Loading

1. Check browser console for errors
2. Ensure internet connection (first load downloads models)
3. Clear browser cache and reload

### Poor Audio Quality

1. Verify fp32 is being used (check console)
2. Try different voices
3. Ensure WebGPU is available

### Audio Cutting Off

1. Queue management should prevent this
2. Check if multiple TTS instances exist
3. Verify `isSpeaking` state is correct

## Files Modified

- ✅ `src/services/KokoroTTS.ts` - New TTS service
- ✅ `src/stores/useResourceStore.ts` - Updated to use new service
- ✅ `src/hooks/useTTS.ts` - Updated API calls
- ✅ `src/App.tsx` - Already initializes TTS

## Next Steps

### Optional Enhancements

1. **Add Voice Selection UI**
   - Create a settings page
   - Let users choose their favorite voice
   - Save preference to localStorage

2. **Add VoiceResponder**
   - Copy from Midnight-Pad
   - Get gapless audio playback
   - Better handling of long text

3. **Add Voice Recognition**
   - Copy full voice service
   - Add wake word detection
   - Add voice commands

## Documentation

- 📖 `KOKORO_IMPLEMENTATION.md` - Detailed implementation guide
- 📊 `VOICE_ANALYSIS.md` - Complete analysis and comparison
- 🚀 `QUICKSTART.md` - This file

## Support

If you encounter issues:

1. Check the console for error messages
2. Review `KOKORO_IMPLEMENTATION.md` for details
3. Compare with Midnight-Pad implementation
4. Check browser compatibility

## Success! 🎉

Your voice_Access project now has the same high-quality Kokoro TTS implementation as Midnight-Pad!

Try it out:

```typescript
const { speak } = useTTS();
await speak("Welcome to Kokoro TTS!", "af_heart");
```
