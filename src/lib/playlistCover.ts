import sharp from "sharp";

const MAX_BASE64_BYTES = 256 * 1024; // Spotify's playlist cover upload limit
const SIZE = 640;

function watermarkSvg(size: number): Buffer {
  const badge = Math.round(size * 0.26);
  const margin = Math.round(size * 0.045);
  const r = badge / 2;
  const cx = size - margin - r;
  const cy = size - margin - r;

  const points = 8;
  const outer = r * 0.82;
  const inner = r * 0.3;
  const coords: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    coords.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const path = `${coords.join(" ")} Z`;

  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="#D97757" fill-opacity="0.94" />
    <path d="${path}" fill="#FAF3EA" />
  </svg>`;
  return Buffer.from(svg);
}

export async function buildPlaylistCoverImage(imageUrl: string): Promise<Buffer> {
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to download artist image (${res.status})`);
  const sourceBuffer = Buffer.from(await res.arrayBuffer());
  const watermark = watermarkSvg(SIZE);

  const render = (quality: number) =>
    sharp(sourceBuffer)
      .resize(SIZE, SIZE, { fit: "cover" })
      .composite([{ input: watermark }])
      .jpeg({ quality })
      .toBuffer();

  let quality = 82;
  let output = await render(quality);
  while (Buffer.byteLength(output.toString("base64")) > MAX_BASE64_BYTES && quality > 30) {
    quality -= 15;
    output = await render(quality);
  }

  return output;
}
