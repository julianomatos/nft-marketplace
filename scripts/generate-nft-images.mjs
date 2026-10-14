import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)
const sourceDirectory = path.join(projectRoot, 'design', 'assets-src')
const outputDirectory = path.join(projectRoot, 'public', 'assets', 'nfts')
const metadataOutput = path.join(
  projectRoot,
  'src',
  'mocks',
  'fixtures',
  'generated-image-metadata.ts',
)

const artworkFiles = [
  'black-gorilla',
  'emerald-ape',
  'golden-ap',
  'hat-gorilla',
]

await mkdir(outputDirectory, { recursive: true })
await mkdir(path.dirname(metadataOutput), { recursive: true })

const imageMetadata = {}

for (const artwork of artworkFiles) {
  const sourcePath = path.join(sourceDirectory, `${artwork}.png`)
  await access(sourcePath)

  for (const size of [960, 480]) {
    const outputPath = path.join(outputDirectory, `${artwork}-${size}.webp`)
    const result = await sharp(sourcePath)
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outputPath)

    if (size === 960) {
      imageMetadata[artwork] = {
        width: result.width,
        height: result.height,
      }
    }
  }
}

const generatedModule = `export const NFT_IMAGE_METADATA = ${JSON.stringify(
  imageMetadata,
  null,
  2,
)} as const\n`

await writeFile(metadataOutput, generatedModule)
