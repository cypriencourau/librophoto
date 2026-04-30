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
      image: { content: Buffer.from(imageArrayBuffer) },
      imageContext: {
        languageHints: ["fr"]
      }
    })

    const annotation = result.fullTextAnnotation

    if (!annotation?.pages?.length) {
      return NextResponse.json({ text: "", words: [] })
    }

    const page = annotation.pages[0]

    const width = page.width || 1
    const height = page.height || 1

    const minX = width * 0.08
    const maxX = width * 0.92
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
          let hasLineBreak = false

          word.symbols?.forEach(s => {
            text += s.text

            const breakType = s.property?.detectedBreak?.type

            if (breakType === "SPACE" || breakType === "SURE_SPACE") {
              text += " "
            }

            if (breakType === "LINE_BREAK" || breakType === "EOL_SURE_SPACE") {
              hasLineBreak = true
            }
          })

        words.push({
          text,
          block: blockIndex,
          paragraph: paragraphIndex,
          line: hasLineBreak ? wordIndex : 0,
          word: wordIndex,
          bbox: { x0, y0, x1, y1 }
        })

          wordIndex++
        })

        paragraphIndex++
      })

      blockIndex++
    })

    let reconstructed = words.map(w => w.text).join("")

      // ===== FIX mots coupés =====
      reconstructed = reconstructed
        .replace(/-\s*\n\s*/g, "")
        .replace(/(\w+)-\s*(\w+)/g, "$1$2")

      // ===== FIX ponctuation française =====
      reconstructed = reconstructed
        .replace(/\s*([:;!?»])/g, " $1")
        .replace(/\s+([.,])/g, "$1")
        .replace(/([:;!?])([^\s])/g, "$1 $2")

      // ===== FIX guillemets =====
      reconstructed = reconstructed
        .replace(/«\s*/g, "« ")
        .replace(/\s*»/g, " »")

      // ===== FIX tiret cadratin =====
      reconstructed = reconstructed
        .replace(/ ?— ?/g, " — ")

      // ===== CLEAN lignes =====
      reconstructed = reconstructed
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n\s+/g, "\n")

      // ===== REMOVE bruit (pages, *) =====
      reconstructed = reconstructed
        .replace(/^\*\s*$/gm, "")
        .replace(/^\d+\s*$/gm, "")

        // ===== FIX apostrophes =====
      reconstructed = reconstructed
        .replace(/(\w)\s+'/g, "$1'")

      // ===== FINAL CLEAN =====
      reconstructed = reconstructed
        .replace(/\s{2,}/g, " ")
        .trim()

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