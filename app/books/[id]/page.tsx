"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Trash2, X } from "lucide-react"

type Capture = {
  id: string
  image_url: string
  created_at: string
}

type Book = {
  id: string
  title: string
}

type OCRWord = {
  text: string
  block: number
  paragraph: number
  line: number
  word: number
  bbox: {
    x0: number
    y0: number
    x1: number
    y1: number
  }
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params?.id as string | undefined

  const [book, setBook] = useState<Book | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [ocrWords, setOcrWords] = useState<OCRWord[]>([])
  const [extracting, setExtracting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedWords, setSelectedWords] = useState<number[]>([])
  const [fullText, setFullText] = useState("")

  const imageRef = useRef<HTMLImageElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadingPreview, setUploadingPreview] = useState<string | null>(null)

  const fileInputCamera = useRef<HTMLInputElement | null>(null)
  const fileInputGallery = useRef<HTMLInputElement | null>(null)

  // ================= FETCH =================

  useEffect(() => {
    if (!bookId) return

    async function fetchData() {
      const { data: bookData } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", bookId)
        .single()

      const { data: captureData } = await supabase
        .from("captures")
        .select("*")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false })

        if (bookData) setBook(bookData)
        setCaptures(captureData ?? [])
        setMenuOpen(false)
    }

    fetchData()
  }, [bookId])

  useEffect(() => {
  if (selectedIndex !== null) {
    document.body.style.overflow = "hidden"
  } else {
    document.body.style.overflow = "auto"
  }

  return () => {
    document.body.style.overflow = "auto"
  }
}, [selectedIndex])
 
  // ================= OCR =================

    async function runOCR(imageUrl: string) {
    try {
      setExtracting(true)
      setOcrWords([])
      setFullText("")

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })

      const result = await response.json()

      const words: OCRWord[] = result.words ?? []

   // 1️⃣ Trier selon la vraie structure OCR
words.sort((a, b) => {
  if (a.block !== b.block) return a.block - b.block
  if (a.paragraph !== b.paragraph) return a.paragraph - b.paragraph
  if (a.line !== b.line) return a.line - b.line
  return a.word - b.word
})

setOcrWords(words)

// 2️⃣ Reconstruction propre
let reconstructed = ""
let currentBlock = -1
let currentParagraph = -1
let currentLine = -1

words.forEach(w => {
  if (w.block !== currentBlock) {
    reconstructed += "\n\n"
    currentBlock = w.block
  }

  if (w.paragraph !== currentParagraph) {
    reconstructed += "\n"
    currentParagraph = w.paragraph
  }

  if (w.line !== currentLine) {
    reconstructed += "\n"
    currentLine = w.line
  }

  reconstructed += w.text + " "
})

// 3️⃣ Nettoyage unique
reconstructed = reconstructed
  .replace(/\s+([.,;:!?»])/g, "$1")
  .replace(/«\s+/g, "«")
  .replace(/\b([ldmtsnjc])\s+'/gi, "$1'")
  .replace(/-\s+/g, "")
  .replace(/\s{2,}/g, " ")
  .replace(/ﬁ/g, "fi")
  .replace(/ﬂ/g, "fl")

setFullText(reconstructed.trim())

    } catch (error) {
      console.error("Erreur OCR :", error)
    } finally {
      setExtracting(false)
    }
  }



  // ================= UPLOAD PHOTO =================

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file || !bookId) return

      // preview instantané
      const previewUrl = URL.createObjectURL(file)
      setUploadingPreview(previewUrl)
      setMenuOpen(false)

      const safeName = file.name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9.-]/g, "")

    const fileName = `${bookId}/${Date.now()}-${safeName}`

      const { error } = await supabase.storage
        .from("captures")
        .upload(fileName, file)

      if (error) {
        console.error(error)
        return
      }

      const { data } = supabase.storage
        .from("captures")
        .getPublicUrl(fileName)


      const { data: newCapture } = await supabase
        .from("captures")
        .insert({
          book_id: bookId,
          image_url: data.publicUrl
        })
        .select()
        .single()

      if (newCapture) {
        setCaptures(prev => [newCapture, ...prev])
      }
      setUploadingPreview(null)

      }

    // ======== SUPPR PHOTO==========
    async function deleteCapture(capture: Capture) {
  if (!confirm("Supprimer cette photo ?")) return

  try {
    const path = capture.image_url.split("/captures/")[1]

    // supprimer du storage
    await supabase.storage
      .from("captures")
      .remove([path])

    // supprimer de la table
    await supabase
      .from("captures")
      .delete()
      .eq("id", capture.id)

    // update UI
    setCaptures(prev =>
      prev.filter(c => c.id !== capture.id)
    )

    setSelectedIndex(null)

  } catch (err) {
    console.error("Erreur suppression:", err)
  }
}

// ================= NAVIGATION =================

  function closeModal() {
    setSelectedIndex(null)
    setOcrWords([])
    setImageLoaded(false)
    setSelectedWords([])
    setFullText("") // reset texte
    setMenuOpen(false)
  }

  function nextImage() {
    if (selectedIndex !== null && selectedIndex < captures.length - 1) {
      setSelectedIndex(selectedIndex + 1)
      setOcrWords([])
      setImageLoaded(false)
      setSelectedWords([])
      setFullText("") // reset texte
    }
  }

  function prevImage() {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
      setOcrWords([])
      setImageLoaded(false)
      setSelectedWords([])
      setFullText("") // reset texte
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (delta > 50) prevImage()
    if (delta < -50) nextImage()
    touchStartX.current = null
  }

  // ================= RENDER =================

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-neutral-950/70 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <button onClick={() => router.back()} className="text-2xl">
            ←
          </button>
          <div>
            <h1 className="text-base font-semibold">{book?.title}</h1>
            <p className="text-xs text-neutral-500">
              {captures.length} photos
            </p>
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="px-4 pt-6 pb-32 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">

      {uploadingPreview && (
        <div className="aspect-3/4 bg-neutral-900 rounded-2xl overflow-hidden animate-pulse">
          <img
            src={uploadingPreview}
            className="w-full h-full object-cover opacity-70"
            alt=""
          />
        </div>
      )}
      
        {captures.map((capture, index) => (
          <div
            key={capture.id}
            onClick={() => setSelectedIndex(index)}
            className="aspect-3/4 bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer"
          >
            <img
              src={capture.image_url}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
        ))}
      </div>

      {/* MODAL */}
        
  {selectedIndex !== null && captures[selectedIndex] && (
  <div
    onClick={closeModal}
    className="fixed inset-0 bg-black/95 flex items-start md:items-center justify-center pt-6 md:pt-0 z-50 overflow-y-auto"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >

    <div className="absolute top-4 right-4 md:right-6 z-[60] flex gap-2">

      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteCapture(captures[selectedIndex])
        }}
        className="p-3 bg-black/60 hover:bg-red-600/80 transition rounded-full backdrop-blur"
      >
        <Trash2 size={18} />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation()
          closeModal()
        }}
        className="p-3 bg-black/60 hover:bg-black/80 transition rounded-full backdrop-blur"
      >
        <X size={18} />
      </button>

    </div>

    {/* flèche gauche */}
    {selectedIndex > 0 && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          prevImage()
        }}
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 text-4xl p-3 bg-black/40 rounded-full backdrop-blur"
      >
        ‹
      </button>
    )}

    {/* CONTENU */}
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex flex-col md:flex-row gap-6 md:gap-10 items-start w-full max-w-6xl px-4 md:px-10"
    >

      {/* IMAGE */}
      <div className="relative w-full">
        <img
          ref={imageRef}
          src={captures[selectedIndex].image_url}
          onLoad={() => setImageLoaded(true)}
          className="w-full md:max-w-[35vw] max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl shadow-2xl"
          alt=""
        />

        {ocrWords.length > 0 && imageLoaded && imageRef.current && (
          <div className="hidden md:block">
            {ocrWords
              .filter((word) => {
                const img = imageRef.current!

                const centerStartX = img.naturalWidth * 0.15
                const centerEndX = img.naturalWidth * 0.85
                const centerStartY = img.naturalHeight * 0.12
                const centerEndY = img.naturalHeight * 0.88

                const horizontalOk =
                  word.bbox.x0 > centerStartX &&
                  word.bbox.x1 < centerEndX

                const verticalOk =
                  word.bbox.y0 > centerStartY &&
                  word.bbox.y1 < centerEndY

                return horizontalOk && verticalOk
              })
              .map((word, i) => {
                const img = imageRef.current!
                const scaleX = img.clientWidth / img.naturalWidth
                const scaleY = img.clientHeight / img.naturalHeight
                const { x0, y0, x1, y1 } = word.bbox

                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: x0 * scaleX,
                      top: y0 * scaleY,
                      width: (x1 - x0) * scaleX,
                      height: (y1 - y0) * scaleY,
                      backgroundColor: "rgba(255,255,0,0.2)",
                    }}
                  />
                )
              })}
          </div>
        )}
      </div>

      {/* TEXTE */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 md:p-6 w-full md:w-[95vw] max-h-[45vh] md:max-h-[80vh] overflow-y-auto mt-4">

        <h3 className="text-sm text-neutral-400 mb-4">
          Texte extrait
        </h3>

        {fullText === "" && !extracting && (
          <div className="mt-4">
            <button
              onClick={() =>
                runOCR(captures[selectedIndex].image_url)
              }
              className="w-full py-4 bg-white text-black rounded-xl text-sm font-medium"
            >
              Scanner le texte
            </button>
          </div>
        )}

        {extracting && (
          <div className="text-sm text-neutral-400">
            Analyse du texte...
          </div>
        )}

        {fullText !== "" && (
          <>
            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              className="w-full h-[30vh] md:h-[60vh] bg-neutral-800 text-sm leading-relaxed p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-white whitespace-pre-wrap"
            />

            <button
              onClick={() => navigator.clipboard.writeText(fullText)}
              className="mt-6 px-4 py-2 bg-white text-black rounded-lg text-sm"
            >
              Copier le texte
            </button>
          </>
        )}

      </div>
    </div>

    {/* flèche droite */}
    {selectedIndex < captures.length - 1 && (
      <button
        onClick={(e) => {
          e.stopPropagation()
          nextImage()
        }}
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 text-4xl p-3 bg-black/40 rounded-full backdrop-blur"
      >
        ›
      </button>
    )}

    {extracting && (
      <div className="absolute bottom-10 text-sm text-neutral-400">
        Analyse du texte...
      </div>
    )}
  </div>
)}

      <input
      ref={fileInputCamera}
      type="file"
      accept="image/*"
      capture="environment"
      style={{ display: "none" }}
      onChange={handleUpload}
    />

    <input
      ref={fileInputGallery}
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={handleUpload}
    />

    {selectedIndex === null && (
    <div className="md:hidden fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {menuOpen && (
        <>
          <button
            onClick={() => {
            setMenuOpen(false)
            fileInputCamera.current?.click()
          }}
            className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-xl text-sm shadow-lg"
          >
            📷 Camera
          </button>

          <button
            onClick={() => {
            setMenuOpen(false)
            fileInputGallery.current?.click()
          }}
            className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-xl text-sm shadow-lg"
          >
            🖼 Galerie
          </button>
        </>
      )}

      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="w-16 h-16 rounded-full bg-white text-black text-4xl flex items-center justify-center shadow-xl"
      >
        +
      </button>

    </div>
    )}

    </main>
  )
}