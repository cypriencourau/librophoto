"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { Trash2, X } from "lucide-react"
import imageCompression from "browser-image-compression"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"

import {
  SortableContext,
  arrayMove,
  rectSortingStrategy
} from "@dnd-kit/sortable"

type Capture = {
  id: string
  image_url: string
  created_at: string
  scanned?: boolean
   position?: number
  ocr_text?: string
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
  const [tab,setTab] = useState("photos")
  const [search,setSearch] = useState("")
  const filteredPearls = useMemo(() => {
  return pearls.filter(p =>
    p.content.toLowerCase().includes(search.toLowerCase())
  )
}, [pearls, search])


  const [ocrWords, setOcrWords] = useState<OCRWord[]>([])
  const [extracting, setExtracting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [selectedWords, setSelectedWords] = useState<number[]>([])
  const [fullText, setFullText] = useState("")
  const [scannedIds, setScannedIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const imageRef = useRef<HTMLImageElement | null>(null)
  const touchStartX = useRef<number | null>(null)
  const textEditorRef = useRef<HTMLDivElement | null>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const [closingSheet, setClosingSheet] = useState(false)
  const [uploadingPreview, setUploadingPreview] = useState<string[]>([])
  const sensors = useSensors(
  useSensor(PointerSensor, {
        activationConstraint: {
          delay: 220,
          tolerance: 8,
        },
  })
)

  const fileInputCamera = useRef<HTMLInputElement | null>(null)
  const fileInputGallery = useRef<HTMLInputElement | null>(null)

  async function fetchPearls(){

  if(!bookId) return

  const {data,error} = await supabase
    .from("pearls")
    .select("id,content,page,tags")
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
        .select("id, image_url, created_at, scanned, position, ocr_text")
        .eq("book_id", bookId)
        .order("position", { ascending: true })

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
      document.body.classList.add("hide-nav")
    } else {
      document.body.style.overflow = "auto"
      document.body.classList.remove("hide-nav")
    }

    return () => {
      document.body.style.overflow = "auto"
      document.body.classList.remove("hide-nav")
    }
  }, [selectedIndex, captures])

    useEffect(() => {
      if (
        textEditorRef.current &&
        fullText &&
        textEditorRef.current.innerHTML === ""
      ) {
        textEditorRef.current.innerHTML = fullText
      }
    }, [fullText])

    //si le texte a déjà été extrait on le garde 

    useEffect(() => {
  if (selectedIndex !== null) {
    const capture = captures[selectedIndex]

    if (capture?.ocr_text) {
      setFullText(capture.ocr_text)
    } else {
      setFullText("")
    }
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

      if (!response.ok) {
      console.error("Erreur API OCR", response.status)
      setToast("Erreur OCR serveur")
      return
    }

    const result = await response.json()
    console.log("OCR RESULT:", result)

      const words: OCRWord[] = result.words ?? []
      console.log("WORDS:", words)

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

const text = reconstructed.trim()
setFullText(text)

if (selectedIndex !== null) {
  const id = captures[selectedIndex]?.id
  if (id) {
    // ✅ sauvegarde en base (persistant)
      await supabase
        .from("captures")
        .update({
          scanned: true,
          ocr_text: text 
        })
        .eq("id", id)

    // ⚡ mise à jour immédiate UI
    setScannedIds(prev =>
      prev.includes(id) ? prev : [...prev, id]
    )

    // 🧠 garde captures sync (important pour refresh visuel)
      setCaptures(prev =>
        prev.map(c =>
          c.id === id
            ? { ...c, scanned: true, ocr_text: text } // 🔥 IMPORTANT
            : c
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

  async function createPearlFromOCR() {
  if (!bookId || !fullText.trim()) return

  try {
    setSaving(true)

    const { error } = await supabase
      .from("pearls")
      .insert({
        content: fullText.trim(),
        book_id: bookId,
        source: book?.title,
        page: pageNumber ? Number(pageNumber) : null,
        tags: tagsInput?.trim() || null
      })

    if (error) throw error

    // reset UI
    setFullText("")
    setPageNumber("")
    setTagsInput("")

    // refresh data
    fetchPearls()

    // toast success
    setToast("✨ Perle ajoutée")
    
    setTimeout(() => {
      setToast(null)
    }, 2000)

  } catch (err) {
    console.error(err)

    // toast erreur clean (pas d'alert)
    setToast("Erreur lors de l’ajout")
    
    setTimeout(() => {
      setToast(null)
    }, 2000)

  } finally {
    setSaving(false)
  }
}

// ================= UPLOAD PHOTO =================

async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
  const files = e.target.files
  if (!files || !bookId) return

const fileArray = Array.from(files)
  .map((file, index) => ({ file, index }))
  .sort((a, b) => {
    if (a.file.lastModified === b.file.lastModified) {
      return b.index - a.index
    }
    return b.file.lastModified - a.file.lastModified
  })
  .map(obj => obj.file)

  setMenuOpen(false)

  try {
    const previews = fileArray.map(file => URL.createObjectURL(file))
    setUploadingPreview(previews)

    let currentMinPosition =
    captures.length > 0
      ? Math.min(...captures.map(c => c.position ?? 0))
      : 0

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
            continue
          }

          const { data } = supabase.storage
            .from("captures")
            .getPublicUrl(fileName)

          const minPosition =
          captures.length > 0
            ? Math.min(...captures.map(c => c.position ?? 0))
            : 0

          currentMinPosition = currentMinPosition - 1
          const newPosition = currentMinPosition

          const { data: newCapture, error: insertError } = await supabase
            .from("captures")
            .insert({
              book_id: bookId,
              image_url: data.publicUrl,
              position: newPosition
            })
            .select()
            .single()

          if (insertError) {
            console.error("Insert error:", insertError)
            return
          }

        if (newCapture) {
          setCaptures(prev => {
            const updated = [newCapture, ...prev]

            if (prev.length === 0) {
              supabase
                .from("books")
                .update({ cover: newCapture.image_url })
                .eq("id", bookId)
            }

            return updated
          })
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
    const url = new URL(capture.image_url)
    const path = capture.image_url.split("/storage/v1/object/public/captures/")[1]

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



async function handleDragEnd(event: any) {
  const { active, over } = event

  if (!over || active.id === over.id) return

const oldIndex = captures.findIndex(c => c.id === active.id)
const newIndex = captures.findIndex(c => c.id === over.id)

const newOrder = arrayMove(captures, oldIndex, newIndex)

  // ✅ update UI propre (ordre réel)
  setCaptures(newOrder)

  // ✅ save DB
  const updates = newOrder.map((c, index) => {
    return supabase
      .from("captures")
      .update({ position: index + 1 })
      .eq("id", c.id)
  })

  await Promise.all(updates)
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

function SortableItem({ capture, index, onClick }: any) {

  const startPos = useRef<{ x: number; y: number } | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: capture.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={(e) => {
        startPos.current = { x: e.clientX, y: e.clientY }
      }}

     onPointerUp={(e) => {
    if (!startPos.current) return

    const dx = Math.abs(e.clientX - startPos.current.x)
    const dy = Math.abs(e.clientY - startPos.current.y)

    const moved = dx > 6 || dy > 6

    if (!moved) {
      onClick()
    }

    startPos.current = null
  }}
    
      className={`group relative aspect-3/4 rounded-2xl overflow-hidden cursor-pointer
      bg-neutral-900 border border-neutral-800
      hover:border-neutral-600 hover:-translate-y-1 transition-all duration-300
      ${isDragging ? "opacity-50 scale-95" : ""}
      `}
    >
      

  {/* 🔥 ZONE DRAG (en haut) */}
  <div
    {...attributes}
    {...listeners}
    className="absolute inset-0 z-10 cursor-grab"
  />

  {/* 🔥 ZONE CLICK */}
      <img
        src={capture.image_url}
        loading="lazy"
        decoding="async"
        className="w-full h-full object-cover transition duration-500 group-hover:scale-110"
      />

      {/* overlay hover */}
     <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition" />

      {/* ✅ coche verte conservée */}
      {capture.scanned && (
        <div className="absolute top-2 right-2 bg-green-500/90 backdrop-blur text-white text-xs px-2 py-1 rounded-full shadow">
          ✓
        </div>
      )}
    </div>
  )
}


  // ================= RENDER =================


  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      {/* HEADER */}
    <div className="sticky top-0 z-40 backdrop-blur bg-neutral-950/80 border-b border-neutral-800">
      <div className="flex items-center justify-between px-4 py-3 max-w-6xl mx-auto">

        <div className="flex items-center gap-3">

          <button
            onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 transition"
          >
            ←
          </button>

          <div>
            <h1 className="text-sm sm:text-base font-semibold leading-tight">
              {book?.title}
            </h1>

            <p className="text-[11px] text-neutral-500">
              {captures.length} photos • {pearls.length} passages
            </p>
          </div>

        </div>

      </div>
    </div>



        {/* TABS */}

      <div className="px-4 pt-4 max-w-6xl mx-auto">
      <div className="inline-flex bg-neutral-900 border border-neutral-800 rounded-xl p-1">

        <button
          onClick={()=>setTab("photos")}
          className={`px-4 py-1.5 text-sm rounded-lg transition ${
            tab==="photos"
              ? "bg-white text-black shadow"
              : "text-neutral-400"
          }`}
        >
          Photos
        </button>

        <button
          onClick={()=>setTab("pearls")}
          className={`px-4 py-1.5 text-sm rounded-lg transition ${
            tab==="pearls"
              ? "bg-white text-black shadow"
              : "text-neutral-400"
          }`}
        >
          Perles
        </button>

      </div>
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

      {filteredPearls.map(p => (

      <div
      key={p.id}
      className="bg-neutral-900 border border-neutral-800 rounded-xl p-4"
      >

      {p.page && (
      <div className="text-xs text-neutral-500 mb-2">
      page {p.page}
      </div>
      )}

      <p
        className="text-[15px] leading-7 whitespace-pre-wrap [&_span[style*='background-color']]:text-black"
        dangerouslySetInnerHTML={{ __html: p.content }}
      />

    {p.tags && (
      <div className="text-xs mt-3 flex flex-wrap gap-2">
        {p.tags
          .split(" ")
          .filter((tag: string) => tag.trim() !== "")
          .map((tag: string, i: number) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded"
            >
              #{tag}
            </span>
          ))}
      </div>
    )}

      
      </div>

      ))}

      </div>

      </div>

      )}


    {/* GRID */}
{tab === "photos" && (
  <DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
    <SortableContext
  items={captures.map(c => c.id)}
      strategy={rectSortingStrategy}
    >
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
          <SortableItem
            key={capture.id}
            capture={capture}
            index={index}
            onClick={() => {
              const newIndex = captures.findIndex(c => c.id === capture.id)
              setSelectedIndex(newIndex)
            }}
          />
        ))}

      </div>
    </SortableContext>
  </DndContext>
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
        {!captures[selectedIndex]?.ocr_text && !extracting && (
          <div className="mt-6">
            <button
              onClick={() => {
                  const capture = captures[selectedIndex]

                  if (capture?.ocr_text) {
                    setFullText(capture.ocr_text)
                  } else {
                    runOCR(capture.image_url)
                  }
                }}
              className="w-full py-4 bg-white text-black rounded-xl text-sm font-medium"
            >
              Extraire le texte
            </button>
          </div>
        )}

        {extracting && (
          <div className="text-sm text-neutral-400">
            Extraction du texte
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
        <div
          ref={textEditorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={(e) => {
            setFullText(e.currentTarget.innerHTML)
          }}
          className="w-full max-w-[65ch] h-[35vh] md:h-[60vh] bg-neutral-800 text-[15px] leading-7 p-5 rounded-lg focus:outline-none whitespace-pre-wrap overflow-y-auto"
        />
            <div className="flex flex-col sm:flex-row gap-3 pt-2">

        <button
          onClick={createPearlFromOCR}
          disabled={saving}
          className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving && (
            <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
          )}
          {saving ? "Création..." : "Créer une perle"}
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
        Extraction du texte
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


{toast && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
    <div className="bg-white text-black text-sm px-4 py-2 rounded-full shadow-lg animate-fadeIn">
      {toast}
    </div>
  </div>
)}



{/* FLOATING ADD BUTTON */}
<div className="fixed right-5 z-40 bottom-[calc(80px+env(safe-area-inset-bottom))]">

  <button
    onClick={() => setMenuOpen(prev => !prev)}
    className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition"
  >
    +
  </button>

</div>


{/* BOTTOM SHEET */}
{menuOpen && (
  <div className="fixed inset-0 z-50">

    {/* BACKDROP */}
    <div
      onClick={() => {
        setClosingSheet(true)
        setTimeout(() => {
          setMenuOpen(false)
          setClosingSheet(false)
        }, 220)
      }}
      className={`
        absolute inset-0 
        bg-black/50 backdrop-blur-sm
        ${closingSheet ? "animate-backdrop-out" : "animate-backdrop-in"}
      `}
    />

    {/* SHEET */}
    <div
      className={`
        absolute bottom-0 left-0 right-0 
        bg-neutral-900 border-t border-neutral-800 
        rounded-t-3xl 
        p-6 
        sheet-safe
        max-h-[85vh]
        overflow-y-auto
        ${closingSheet ? "animate-sheet-out" : "animate-sheet-in"}
      `}
    >

      {/* HANDLE */}
      <div className="w-10 h-1 bg-neutral-700 rounded-full mx-auto mb-6" />

      {/* TITLE */}
      <h3 className="text-sm text-neutral-400 mb-4 text-center">
        Ajouter une photo
      </h3>

      {/* ACTIONS */}
      <div className="flex flex-col gap-3">

        <button
          onClick={() => {
            setClosingSheet(true)
            setTimeout(() => {
              setMenuOpen(false)
              setClosingSheet(false)
              fileInputCamera.current?.click()
            }, 220)
          }}
          className="w-full py-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center gap-2 text-sm hover:scale-[1.02] active:scale-[0.98] transition"
        >
          📷 Prendre une photo
        </button>

        <button
          onClick={() => {
            setClosingSheet(true)
            setTimeout(() => {
              setMenuOpen(false)
              setClosingSheet(false)
              fileInputGallery.current?.click()
            }, 220)
          }}
          className="w-full py-4 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center gap-2 text-sm hover:scale-[1.02] active:scale-[0.98] transition"
        >
          🖼 Importer depuis la galerie
        </button>

      </div>

    </div>
  </div>
)}
    </main>
  )
}