export const getOrdinalIndex = (input: string): number | null => {
  const map: Record<string, number> = {
    'one': 0, 'first': 0, '1st': 0, '1': 0,
    'two': 1, 'second': 1, '2nd': 1, '2': 1,
    'three': 2, 'third': 2, '3rd': 2, '3': 2,
    'four': 3, 'fourth': 3, '4th': 3, '4': 3,
    'five': 4, 'fifth': 4, '5th': 4, '5': 5,
    'six': 5, 'sixth': 5, '6th': 5, '6': 5,
    'seven': 6, 'seventh': 6, '7th': 6, '7': 6,
    'eight': 7, 'eighth': 7, '8th': 7, '8': 7,
    'nine': 8, 'ninth': 8, '9th': 8, '9': 8,
    'ten': 9, 'tenth': 9, '10th': 9, '10': 9
  };
  
  if (map[input] !== undefined) return map[input];
  for (const [key, val] of Object.entries(map)) {
    if (input.includes(`number ${key}`) || input.includes(`the ${key}`)) return val;
  }
  return null;
};

export const cleanVoiceText = (text: string) => {
  return text.toLowerCase().trim().replace(/[.,!?;:]/g, '');
};

export const parseAnyNumber = (text: string): number | null => {
  const digits = text.match(/\d+/);
  if (digits) return parseInt(digits[0]);

  const words: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90, 'hundred': 100
  };

  const parts = text.split(/\s+/);
  for (const part of parts) {
    if (words[part] !== undefined) return words[part];
  }
  
  return null;
};

export const normalizeLaunchIntent = (text: string) => {
  return text.replace(/^(launch|open|start|run)\s+/i, '').trim();
};
