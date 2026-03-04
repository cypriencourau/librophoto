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

    const imageResponse = await fetch(imageUrl)
    const imageArrayBuffer = await imageResponse.arrayBuffer()

    const [result] = await client.documentTextDetection({
      image: { content: Buffer.from(imageArrayBuffer) }
    })

    const annotation = result.fullTextAnnotation

    if (!annotation?.pages?.length) {
      return NextResponse.json({ text: "", words: [] })
    }

    const page = annotation.pages[0]

    const width = page.width || 1
    const height = page.height || 1

    const minX = width * 0.15
    const maxX = width * 0.85
    const minY = height * 0.10
    const maxY = height * 0.90

    const words: any[] = []

    let blockIndex = 0

    page.blocks?.forEach(block => {

      let paragraphIndex = 0

      block.paragraphs?.forEach(paragraph => {

        let wordIndex = 0

        paragraph.words?.forEach(word => {

          const box = word.boundingBox?.vertices
          if (!box) return

          const x0 = box[0].x || 0
          const y0 = box[0].y || 0
          const x1 = box[2].x || 0
          const y1 = box[2].y || 0

          if (x0 < minX || x0 > maxX) return
          if (y0 < minY || y0 > maxY) return

          let text = ""
          word.symbols?.forEach(s => text += s.text)

          words.push({
            text,
            block: blockIndex,
            paragraph: paragraphIndex,
            line: paragraphIndex,
            word: wordIndex,
            bbox: { x0, y0, x1, y1 }
          })

          wordIndex++
        })

        paragraphIndex++
      })

      blockIndex++
    })

    const reconstructed = words.map(w => w.text).join(" ")

    await supabase.from("ocr_usage").insert({})

    return NextResponse.json({
      text: reconstructed,
      words
    })

  } catch (error) {

    console.error("Vision OCR error:", error)

    return NextResponse.json(
      { error: "OCR failed" },
      { status: 500 }
    )
  }
}