import { NextResponse } from "next/server"
import vision from "@google-cloud/vision"
import { createClient } from "@supabase/supabase-js"

export const runtime = "nodejs"

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_VISION_KEY!)
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { imageUrl } = await request.json()

    const [result] = await client.documentTextDetection(imageUrl)
    const annotation = result.fullTextAnnotation

    if (!annotation?.pages?.length) {
      return NextResponse.json({ text: "" })
    }

    const page = annotation.pages[0]

    const width = page.width || 1
    const height = page.height || 1

    const minX = width * 0.15
    const maxX = width * 0.85
    const minY = height * 0.10
    const maxY = height * 0.90

    let reconstructed = ""

    page.blocks?.forEach(block => {
      block.paragraphs?.forEach(paragraph => {
        paragraph.words?.forEach(word => {

          const box = word.boundingBox?.vertices
          if (!box) return

          const x = box[0].x || 0
          const y = box[0].y || 0

          // 🔥 FILTRE CENTRAL
          if (x < minX || x > maxX) return
          if (y < minY || y > maxY) return

          word.symbols?.forEach(symbol => {
            reconstructed += symbol.text
          })

          reconstructed += " "
        })

        reconstructed += "\n\n"
      })
    })

reconstructed = reconstructed
  .replace(/-\n/g, "")
  .replace(/\n{3,}/g, "\n\n")
  .trim()

// 🔥 Incrémenter le compteur mensuel
await supabase.from("ocr_usage").insert({})

return NextResponse.json({ text: reconstructed })

  } catch (error) {
    console.error("Vision OCR error:", error)
    return NextResponse.json(
      { error: "OCR failed" },
      { status: 500 }
    )
  }
}