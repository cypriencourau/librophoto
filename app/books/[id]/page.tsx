"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Trash2, X } from "lucide-react"
import imageCompression from "browser-image-compression"

type Capture = {
  id: string
  image_url: string
  created_at: string
  scanned?: boolean
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
  const [pearls,setPearls] = useState<any[]>([])
  const [pageNumber,setPageNumber] = useState("")
  const [tagsInput,setTagsInput] = useState("")
  const [tab,setTab] = useState("pearls")
  const [search,setSearch] = useState("")

  const [ocrWords, setOcrWords] = useState<OCRWord[]>([])
  const [extracting, setExtracting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedWords, setSelectedWords] = useState<number[]>([])
  const [fullText, setFullText] = useState("")
  const [scannedIds, setScannedIds] = useState<string[]>([])

  const imageRef = useRef<HTMLImageElement | null>(null)
  const touchStartX = useRef<number | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [uploadingPreview, setUploadingPreview] = useState<string[]>([])

  const fileInputCamera = useRef<HTMLInputElement | null>(null)
  const fileInputGallery = useRef<HTMLInputElement | null>(null)

  async function fetchPearls(){

  if(!bookId) return

  const {data,error} = await supabase
    .from("pearls")
    .select("id,content,page")
    .eq("book_id",bookId)
    .order("page",{ascending:true, nullsFirst:true})

  if(error){
    console.error(error)
    return
  }

  setPearls(data || [])

}

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
        .order("created_at", { ascending: true })

        if (bookData) setBook(bookData)
        setCaptures(captureData ?? [])

        // ✅ AJOUT ICI
        const scanned = (captureData || [])
          .filter(c => c.scanned === true)
          .map(c => c.id)

        setScannedIds(scanned)

        setMenuOpen(false)

        fetchPearls()
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

if (selectedIndex !== null) {
  const id = captures[selectedIndex]?.id
  if (id) {
    // ✅ sauvegarde en base (persistant)
    await supabase
      .from("captures")
      .update({ scanned: true })
      .eq("id", id)

    // ⚡ mise à jour immédiate UI
    setScannedIds(prev =>
      prev.includes(id) ? prev : [...prev, id]
    )

    // 🧠 garde captures sync (important pour refresh visuel)
    setCaptures(prev =>
      prev.map(c =>
        c.id === id ? { ...c, scanned: true } : c
      )
    )
  }
}

} catch (error) {
  console.error("Erreur OCR :", error)
} finally {
  setExtracting(false)
}
}
  
  // ================= GARDER UNE PERLE OCR =================

      async function createPearlFromOCR(){

        if(!bookId || !fullText) return

        const {error} = await supabase
          .from("pearls")
          .insert({
            content: fullText,
            book_id: bookId,
            source: book?.title,
            page: pageNumber ? Number(pageNumber) : null,
            tags: tagsInput
          })

        if(error){
          console.error(error)
          alert("Erreur création perle")
          return
        }

        setFullText("")
        setPageNumber("")
        setTagsInput("")

        fetchPearls()

      }

// ================= UPLOAD PHOTO =================

async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files
  if (!files || !bookId) return

  const fileArray = Array.from(files).sort((a, b) => {
  return a.lastModified - b.lastModified
  })

  setMenuOpen(false)

  try {
    const previews = fileArray.map(file => URL.createObjectURL(file))
    setUploadingPreview(previews)

      for (const file of fileArray) {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1600,
            useWebWorker: true,
            initialQuality: 0.7
          })

          console.log(
            `Avant: ${(file.size / 1024 / 1024).toFixed(2)} MB → Après: ${(compressedFile.size / 1024 / 1024).toFixed(2)} MB`
          )

          const safeName = file.name
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9.-]/g, "")

          const fileName = `${bookId}/${Date.now()}-${safeName}`

          const { error: uploadError } = await supabase.storage
            .from("captures")
            .upload(fileName, compressedFile, {
              contentType: compressedFile.type
            })

          if (uploadError) {
            console.error("Upload error:", uploadError)
            return
          }

          const { data } = supabase.storage
            .from("captures")
            .getPublicUrl(fileName)

          const { data: newCapture, error: insertError } = await supabase
            .from("captures")
            .insert({
              book_id: bookId,
              image_url: data.publicUrl
            })
            .select()
            .single()

          if (insertError) {
            console.error("Insert error:", insertError)
            return
          }

          if (newCapture) {
            setCaptures(prev => [...prev, newCapture])
          }

        } catch (err) {
          console.error("Erreur sur une image :", err)
        }
      }

  } catch (err) {
    console.error("Global upload error:", err)
  } finally {
  uploadingPreview.forEach(url => URL.revokeObjectURL(url))
  setUploadingPreview([])
  e.target.value = ""
}
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
      <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">

        <div className="flex items-center gap-3">

          <button
            onClick={() => router.back()}
            className="text-2xl"
          >
            ←
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-semibold">
              {book?.title}
            </h1>

            <p className="text-xs text-neutral-500">
              {pearls.length} passages • {captures.length} photos
            </p>
          </div>

        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg bg-neutral-800 hover:bg-neutral-700"
        >
          📷
        </button>

      </div>



      {menuOpen && (

          <div className="px-4 pb-4 max-w-6xl mx-auto flex gap-2">

          <button
          onClick={()=>{
          setMenuOpen(false)
          fileInputCamera.current?.click()
          }}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm"
          >
          📷 Camera
          </button>

          <button
          onClick={()=>{
          setMenuOpen(false)
          fileInputGallery.current?.click()
          }}
          className="px-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm"
          >
          🖼 Galerie
          </button>

          </div>

          )}

      {/* TABS */}

      <div className="flex gap-2 px-4 pt-4 max-w-6xl mx-auto">

        <button
      onClick={()=>setTab("photos")}
      className={`px-3 py-1.5 text-sm rounded-lg ${
      tab==="photos"
      ? "bg-white text-black"
      : "bg-neutral-800 text-neutral-300"
      }`}
      >
      Photos
      </button>

      <button
      onClick={()=>setTab("pearls")}
      className={`px-3 py-1.5 text-sm rounded-lg ${
      tab==="pearls"
      ? "bg-white text-black"
      : "bg-neutral-800 text-neutral-300"
      }`}
      >
      Perles
      </button>

            </div>

      {/* PASSAGES DU LIVRE */}

      {tab === "pearls" && pearls.length > 0 && (

      <div className="px-4 pt-6 max-w-3xl mx-auto">

      <h2 className="text-lg font-semibold mb-4">
      Passages sauvegardés
      </h2>

      <input
        value={search}
        onChange={(e)=>setSearch(e.target.value)}
        placeholder="Rechercher dans ce livre..."
        className="w-full mb-6 px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm focus:outline-none focus:border-neutral-600"
        />

      <div className="space-y-4">

      {pearls
        .filter(p => 
          p.content.toLowerCase().includes(search.toLowerCase())
        )
        .map(p => (

      <div
      key={p.id}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
      >

      {p.page && (
      <div className="text-xs text-neutral-500 mb-2">
      page {p.page}
      </div>
      )}

      <p className="text-[15px] leading-7 whitespace-pre-wrap">
      {p.content}
      </p>

      </div>

      ))}

      </div>

      </div>

      )}

    {/* GRID */}
{tab === "photos" && (
  <div className="px-4 pt-6 pb-32 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 max-w-6xl mx-auto">

    {uploadingPreview.map((url, i) => (
      <div
        key={i}
        className="aspect-3/4 bg-neutral-900 rounded-2xl overflow-hidden animate-pulse"
      >
        <img
          src={url}
          className="w-full h-full object-cover opacity-70"
          alt=""
        />
      </div>
    ))}

    {captures.map((capture, index) => (
      <div
        key={capture.id}
        onClick={() => setSelectedIndex(index)}
        className="relative aspect-3/4 bg-neutral-900 rounded-2xl overflow-hidden"
      >
      <img
        src={capture.image_url}
        loading="lazy"
        decoding="async"
      />
        {capture.scanned && (
          <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur text-white text-xs px-2 py-1 rounded-full shadow">
            ✓
          </div>
        )}
      </div>
    ))}

  </div>
)}

      {/* MODAL */}
        
  {selectedIndex !== null && captures[selectedIndex] && (
  <div
    onClick={closeModal}
    className="fixed inset-0 bg-black/95 flex items-start md:items-center justify-center pt-6 md:pt-0 z-50 overflow-y-auto"
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >

    <div className="absolute top-4 right-4 md:right-6 z-60 flex gap-2">

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
      className="flex flex-col md:flex-row gap-4 md:gap-6 items-stretch md:items-start w-full max-w-6xl px-4 md:px-10">

      {/* IMAGE */}
      <div className="relative w-full">
        <img
          ref={imageRef}
          src={captures[selectedIndex].image_url}
          onLoad={() => setImageLoaded(true)}
          className="w-full md:max-w-[35vw] max-h-[50vh] md:max-h-[80vh] object-contain rounded-xl shadow-2xl"
          alt=""
        />


//voir les blocs jaunes de sélection des mots en OCR
        {ocrWords.length > 0 && imageLoaded && imageRef.current && (
          <div className="hidden">
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
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-7 w-full md:max-w-[520px] lg:max-w-[600px] h-[45vh] md:h-auto md:max-h-[80vh] overflow-y-auto mt-2 md:mt-4">

        <h3 className="text-sm text-neutral-400 mb-4">
          Texte extrait
        </h3>

        <div className="space-y-6">
        {fullText === "" && !extracting && (
          <div className="mt-6">
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

          <div className="flex flex-col sm:flex-row gap-3">

          <input
          value={pageNumber}
          onChange={(e)=>setPageNumber(e.target.value)}
          placeholder="page"
          className="w-24 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
          />

          <input
          value={tagsInput}
          onChange={(e)=>setTagsInput(e.target.value)}
          placeholder="tags : foi silence prière"
          className="flex-1 px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg text-sm focus:outline-none focus:border-neutral-500"
          />

          </div>
        </div>

        {fullText !== "" && (
          <>
          <div className="space-y-5 mt-4"></div>
            <textarea
              value={fullText}
              onChange={(e) => setFullText(e.target.value)}
              className="w-full max-w-[65ch] h-[35vh] md:h-[60vh] bg-neutral-800 text-[15px] leading-7 p-5 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-white whitespace-pre-wrap break-words overflow-x-hidden"
            />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">

            <button
            onClick={createPearlFromOCR}
            className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
            >
            Créer une perle
            </button>

            </div>
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
    multiple
    style={{ display: "none" }}
    onChange={handleUpload}
  />

    </main>
  )
}