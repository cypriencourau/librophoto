"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"

type Capture = {
  id: string
  image_url: string
  created_at: string
}

type Book = {
  id: string
  title: string
}

export default function BookPage() {
  const params = useParams()
  const router = useRouter()
  const bookId = params?.id as string | undefined

  const [book, setBook] = useState<Book | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const [extracting, setExtracting] = useState(false)
  const [fullText, setFullText] = useState("")

  const touchStartX = useRef<number | null>(null)

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
    }

    fetchData()
  }, [bookId])

  // ================= OCR =================

  async function runOCR(imageUrl: string) {
    try {
      setExtracting(true)
      setFullText("")

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      })

      const result = await response.json()

      let text = result.text || ""

      // Nettoyage léger
      text = text
        .replace(/-\n/g, "")        // mots coupés en fin de ligne
        .replace(/\n{3,}/g, "\n\n") // trop de sauts
        .trim()

      setFullText(text)

    } catch (error) {
      console.error("Erreur OCR :", error)
    } finally {
      setExtracting(false)
    }
  }

  useEffect(() => {
    if (selectedIndex !== null && captures[selectedIndex]) {
      runOCR(captures[selectedIndex].image_url)
    }
  }, [selectedIndex, captures])

  // ================= NAVIGATION =================

  function closeModal() {
    setSelectedIndex(null)
    setFullText("")
  }

  function nextImage() {
    if (selectedIndex !== null && selectedIndex < captures.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  function prevImage() {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
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
      <div className="sticky top-0 bg-neutral-950 border-b border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <button onClick={() => router.push("/")} className="text-2xl">
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
      <div className="px-4 pt-6 pb-32 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
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
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-50"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 text-xl"
          >
            ✕
          </button>

          {selectedIndex > 0 && (
            <button
              onClick={prevImage}
              className="absolute left-6 text-4xl"
            >
              ‹
            </button>
          )}

          <div className="flex gap-10 items-start max-w-6xl w-full px-10">

            {/* IMAGE */}
            <div>
              <img
                src={captures[selectedIndex].image_url}
                className="max-h-[80vh] max-w-[40vw] rounded-xl shadow-2xl"
                alt=""
              />
            </div>

            {/* TEXTE */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-[40vw] max-h-[80vh] overflow-y-auto">
              <h3 className="text-sm text-neutral-400 mb-4">
                Texte extrait
              </h3>

              <textarea
                value={fullText}
                onChange={(e) => setFullText(e.target.value)}
                className="w-full h-[60vh] bg-neutral-800 text-sm leading-relaxed p-4 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-white whitespace-pre-wrap"
              />

              <button
                onClick={() => navigator.clipboard.writeText(fullText)}
                className="mt-6 px-4 py-2 bg-white text-black rounded-lg text-sm"
              >
                Copier le texte
              </button>
            </div>

          </div>

          {selectedIndex < captures.length - 1 && (
            <button
              onClick={nextImage}
              className="absolute right-6 text-4xl"
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

    </main>
  )
}