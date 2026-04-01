// ── Grouping logic ──────────────────────────────────────────────────────────
// Recognises filename patterns like:
//   ad01_feed.jpg      → group "ad01",    placement "feed"
//   ad01_stories.mp4   → group "ad01",    placement "stories"
//   banner_reels.mp4   → group "banner",  placement "reels"
//   produto.jpg        → group "produto", placement "feed" (default)
//
// Placement keywords checked (case-insensitive, anywhere after the last "_"):
const PLACEMENT_KEYWORDS = [
  'feed', 'stories', 'story', 'reels', 'reel',
  'square', 'vertical', 'horizontal', 'carousel',
  'banner', 'explore', 'marketplace', 'instream',
]

export type Placement = 'feed' | 'stories' | 'reels' | string

export interface CreativeFile {
  id: string          // browser temp id
  file: File
  preview?: string    // object URL for images
  name: string        // original filename without extension
  ext: string
  placement: Placement
  group: string
}

export interface CreativeGroup {
  name: string
  files: CreativeFile[]
}

/** Parse a File into its group + placement. */
export function parseFile(file: File, id: string): CreativeFile {
  const dotIdx = file.name.lastIndexOf('.')
  const ext = dotIdx >= 0 ? file.name.slice(dotIdx + 1).toLowerCase() : ''
  const base = dotIdx >= 0 ? file.name.slice(0, dotIdx) : file.name

  const lower = base.toLowerCase()
  let placement: string = 'feed'
  let group = base

  // Try splitting on "_" and checking the last segment
  const parts = base.split('_')
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1].toLowerCase()
    if (PLACEMENT_KEYWORDS.includes(lastPart)) {
      placement = lastPart
      group = parts.slice(0, -1).join('_')
    }
  }

  // Fallback: check if any keyword is a suffix substring
  if (group === base) {
    for (const kw of PLACEMENT_KEYWORDS) {
      if (lower.endsWith(kw) && lower.length > kw.length) {
        placement = kw
        group = base.slice(0, base.length - kw.length).replace(/[_\-\s]+$/, '')
        break
      }
    }
  }

  const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined

  return { id, file, preview, name: base, ext, placement, group }
}

/** Group an array of CreativeFile by their group name. */
export function groupCreatives(files: CreativeFile[]): CreativeGroup[] {
  const map = new Map<string, CreativeFile[]>()
  for (const f of files) {
    const arr = map.get(f.group) ?? []
    arr.push(f)
    map.set(f.group, arr)
  }
  return Array.from(map.entries()).map(([name, fs]) => ({ name, files: fs }))
}
