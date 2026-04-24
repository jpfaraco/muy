const imageCache = new Map<string, HTMLImageElement>()

export function loadImage(url: string): Promise<HTMLImageElement> {
  if (imageCache.has(url)) return Promise.resolve(imageCache.get(url)!)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => { imageCache.set(url, img); resolve(img) }
    img.onerror = reject
    img.src = url
  })
}

export function getCachedImage(url: string): HTMLImageElement | undefined {
  return imageCache.get(url)
}
