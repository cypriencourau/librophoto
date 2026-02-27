"use client"

import { useEffect, useState } from "react"
import imageCompression from "browser-image-compression"
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
  const bookId = params?.id as string

  const [book, setBook] = useState<Book | null>(null)
  const [captures, setCaptures] = useState<Capture[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

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
    setCaptures(captureData || [])
  }

  useEffect(() => {
    if (bookId) fetchData()
  }, [bookId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files?.length) return

    try {
      setUploading(true)

      const file = e.target.files[0]

      // 🔥 Compression
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.7,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      })

      const filePath = `${bookId}/${Date.now()}.jpg`

      // Optimistic preview
      const localPreview = URL.createObjectURL(compressedFile)
      const tempId = "temp-" + Date.now()

      setCaptures((prev) => [
        {
          id: tempId,
          image_url: localPreview,
          created_at: new Date().toISOString(),
        },
        ...prev,
      ])

      const { error: uploadError } = await supabase.storage
        .from("captures")
        .upload(filePath, compressedFile)

      if (uploadError) throw uploadError

      const { data } = supabase.storage
        .from("captures")
        .getPublicUrl(filePath)

      const { data: inserted } = await supabase
        .from("captures")
        .insert([
          {
            book_id: bookId,
            image_url: data.publicUrl,
          },
        ])
        .select()
        .single()

      // Replace temp with real
      setCaptures((prev) =>
        prev.map((c) => (c.id === tempId ? inserted : c))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  function nextImage() {
    if (selectedIndex === null) return
    if (selectedIndex < captures.length - 1)
      setSelectedIndex(selectedIndex + 1)
  }

  function prevImage() {
    if (selectedIndex === null) return
    if (selectedIndex > 0)
      setSelectedIndex(selectedIndex - 1)
  }

  async function deleteCurrent() {
    if (selectedIndex === null) return

    const capture = captures[selectedIndex]

    await supabase
      .from("captures")
      .delete()
      .eq("id", capture.id)

    const path = capture.image_url.split("/captures/")[1]
    if (path) {
      await supabase.storage.from("captures").remove([path])
    }

    const newCaptures = captures.filter((_, i) => i !== selectedIndex)
    setCaptures(newCaptures)

    if (newCaptures.length === 0) setSelectedIndex(null)
    else if (selectedIndex >= newCaptures.length)
      setSelectedIndex(newCaptures.length - 1)
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">

      {/* HEADER */}
      <div className="sticky top-0 z-40 bg-neutral-950/80 backdrop-blur border-b border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-3 max-w-6xl mx-auto">
          <button
            onClick={() => router.push("/")}
            className="text-neutral-400 text-2xl active:scale-95 transition"
          >
            ←
          </button>

          <div>
            <h1 className="text-base font-semibold">
              {book?.title}
            </h1>
            <p className="text-xs text-neutral-500">
              {captures.length} photos
            </p>
          </div>
        </div>
      </div>

      {/* GRID RESPONSIVE CLEAN */}
      <div className="
        px-4 pt-6 pb-32
        grid
        grid-cols-2
        md:grid-cols-3
        lg:grid-cols-4
        xl:grid-cols-5
        gap-4
        max-w-6xl
        mx-auto
      ">
        {captures.map((capture, index) => (
          <div
            key={capture.id}
            onClick={() => setSelectedIndex(index)}
            className="aspect-3/4 bg-neutral-900 rounded-2xl overflow-hidden cursor-pointer"
          >
            <img
              src={capture.image_url}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* MODAL */}
      {/* MODAL */}
{selectedIndex !== null && (
  <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50">

    {/* CLOSE */}
    <button
      onClick={() => setSelectedIndex(null)}
      className="absolute top-6 right-6 text-neutral-400 hover:text-white text-xl"
    >
      ✕
    </button>

    {/* PREVIOUS */}
    {selectedIndex > 0 && (
      <button
        onClick={prevImage}
        className="absolute left-6 text-4xl text-white opacity-70 hover:opacity-100 transition"
      >
        ‹
      </button>
    )}

    {/* IMAGE */}
    <img
      src={captures[selectedIndex].image_url}
      className="max-h-[80vh] max-w-[80vw] rounded-xl shadow-2xl"
    />

    {/* NEXT */}
    {selectedIndex < captures.length - 1 && (
      <button
        onClick={nextImage}
        className="absolute right-6 text-4xl text-white opacity-70 hover:opacity-100 transition"
      >
        ›
      </button>
    )}

    {/* DELETE */}
    <button
      onClick={deleteCurrent}
      className="absolute bottom-8 px-6 py-3 bg-red-600 rounded-2xl font-medium hover:bg-red-500 transition"
    >
      Supprimer
    </button>

  </div>
)}

      {/* FLOATING BUTTON */}
      <label className="fixed bottom-6 right-6 z-50 pb-[env(safe-area-inset-bottom)]">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleUpload}
          className="hidden"
        />
        <div className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center text-3xl shadow-xl">
          {uploading ? "…" : "+"}
        </div>
      </label>

    </main>
  )
}