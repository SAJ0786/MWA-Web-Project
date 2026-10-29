export const TEXT_SIZES=[100,105,110];
export function normaliseTextSize(value){const number=Number(value);if(!Number.isFinite(number))return 100;return Math.min(110,Math.max(100,Math.round(number/5)*5));}
export function applyTextSize(value){const size=normaliseTextSize(value);document.documentElement.style.setProperty('--mwa-text-scale',String(size/100));document.documentElement.dataset.textSize=String(size);return size;}
