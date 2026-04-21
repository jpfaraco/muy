/**
 * Generates simple colored rectangle placeholder assets as data URLs.
 * These stand in for the actual artwork until real images are imported.
 */

function makeSvgDataUrl(svg: string): string {
  const encoded = encodeURIComponent(svg)
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

function rect(color: string, label: string, w = 400, h = 300): string {
  return makeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
      <rect width="${w}" height="${h}" fill="${color}" rx="4"/>
      <text x="${w / 2}" y="${h / 2}" font-family="sans-serif" font-size="24"
        text-anchor="middle" dominant-baseline="middle" fill="white" opacity="0.8">${label}</text>
    </svg>
  `.trim())
}


function leafShape(color: string): string {
  return makeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="90">
      <ellipse cx="30" cy="45" rx="22" ry="40" fill="${color}" transform="rotate(-15 30 45)"/>
      <line x1="30" y1="10" x2="30" y2="80" stroke="rgba(0,0,0,0.3)" stroke-width="2"/>
    </svg>
  `.trim())
}

function bunnyShape(color: string, ears: 'up' | 'flat' | 'mid'): string {
  const earLeft = ears === 'up' ? 'M20,55 Q15,30 18,10 Q22,5 26,10 Q28,30 25,55' :
                  ears === 'flat' ? 'M20,55 Q10,50 5,40 Q8,35 14,38 Q22,50 25,55' :
                  'M20,55 Q12,40 14,22 Q18,17 22,22 Q26,40 25,55'
  const earRight = ears === 'up' ? 'M40,55 Q45,30 42,10 Q38,5 34,10 Q32,30 35,55' :
                   ears === 'flat' ? 'M40,55 Q50,50 55,40 Q52,35 46,38 Q38,50 35,55' :
                   'M40,55 Q48,40 46,22 Q42,17 38,22 Q34,40 35,55'
  return makeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="60" height="100">
      <path d="${earLeft}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <path d="${earRight}" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <ellipse cx="30" cy="72" rx="22" ry="28" fill="${color}" stroke="rgba(0,0,0,0.2)" stroke-width="1"/>
      <circle cx="24" cy="64" r="4" fill="rgba(0,0,0,0.6)"/>
      <circle cx="36" cy="64" r="4" fill="rgba(0,0,0,0.6)"/>
      <circle cx="25" cy="63" r="1.5" fill="white"/>
      <circle cx="37" cy="63" r="1.5" fill="white"/>
    </svg>
  `.trim())
}

function trunkShape(): string {
  return makeSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="80" height="200">
      <path d="M30,200 Q25,150 35,100 Q30,60 40,20 Q50,60 45,100 Q55,150 50,200 Z"
        fill="#8B6914" stroke="#5c4610" stroke-width="1"/>
      <path d="M35,100 Q10,80 5,60 Q20,65 30,80" fill="#8B6914" stroke="#5c4610" stroke-width="1"/>
      <path d="M45,90 Q65,65 70,45 Q55,55 47,75" fill="#8B6914" stroke="#5c4610" stroke-width="1"/>
    </svg>
  `.trim())
}

export const SAMPLE_IMAGE_ASSETS = {
  background: { id: 'asset-background', name: 'Background', urls: [rect('#4a7fa5', 'Background', 800, 500)] },
  midground: { id: 'asset-midground', name: 'Midground', urls: [rect('#6b9e6b', 'Midground', 700, 350)] },
  foreground: { id: 'asset-foreground', name: 'Foreground', urls: [rect('#8B6914', 'Foreground', 800, 150)] },
  trunk: { id: 'asset-trunk', name: 'Trunk', urls: [trunkShape()] },
  leaf: { id: 'asset-leaf', name: 'Leaf', urls: [leafShape('#5a8a3c'), leafShape('#8a5a3c')] },
  bunny: {
    id: 'asset-bunny', name: 'Bunny', urls: [
      bunnyShape('#c8a87a', 'up'),
      bunnyShape('#c8a87a', 'mid'),
      bunnyShape('#c8a87a', 'flat'),
    ]
  },
}

/** Canvas dimensions for the animation */
export const CANVAS_WIDTH = 1920
export const CANVAS_HEIGHT = 1080
