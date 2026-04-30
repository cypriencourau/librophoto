  "use client"

  import { useEffect, useState, useRef } from "react"
  import { supabase } from "@/lib/supabase"
  import { useParams, useRouter } from "next/navigation"
  import { ArrowLeft, Save, Trash2, ExternalLink, X } from "lucide-react"
  import { useAutoSave } from "@/app/hooks/useAutoSave"
  
  export default function PearlPage(){


    
  const params = useParams()
  const router = useRouter()

  const id = Array.isArray(params.id) ? params.id[0] : params.id

  const [loading,setLoading] = useState(true)
  const [saving,setSaving] = useState(false)

  const [content,setContent] = useState("")
  const [source,setSource] = useState("")
  const [theme,setTheme] = useState("")
  const [tags,setTags] = useState<string[]>([])
  const [tagInput,setTagInput] = useState("")
  const [link,setLink] = useState("")

  const loadedRef = useRef(false)
  const lastSavedRef = useRef<string>("")
  const editorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
  if (editorRef.current && editorRef.current.innerHTML === "") {
    editorRef.current.innerHTML = content
  }
}, [content])
  
  const { triggerSave, status } = useAutoSave(savePearl)




  ///////////////////////
// LOAD PEARL
///////////////////////

useEffect(() => {
  if (id) {
    loadPearl()
  }
}, [id])

async function loadPearl() {
  try {
    setLoading(true)

    const { data, error } = await supabase
      .from("pearls")
      .select("*")
      .eq("id", id as string)
      .single()

    if (error) throw error
    if (!data) return

      const safeTags =
        typeof data.tags === "string"
          ? data.tags.split(" ").filter((t: string) => t)
          : []

      setTags(safeTags)

      setContent(data.content || "")
    setSource(data.source || "")
    setTheme(data.theme || "")
    setLink(data.link || "")


    // ⚠️ CRITIQUE → sync autosave (anti boucle)
    const initialPayload = JSON.stringify({
      content: data.content || "",
      source: data.source || "",
      theme: data.theme || "",
      tags: safeTags.sort(),
      link: data.link || ""
    })

    lastSavedRef.current = initialPayload
    loadedRef.current = true

  } catch (err) {
    console.error("Load error:", err)
  } finally {
    setLoading(false)
  }
}



///////////////////////
// SAVE PEARL
///////////////////////

async function savePearl() {
  if (!loadedRef.current) return
  if (!id) return

  // 🔒 normalisation stable
  const normalizedTags = Array.isArray(tags) ? [...tags].sort() : []

  const payloadObj = {
    content,
    source,
    theme,
    tags: normalizedTags,
    link
  }

  const payload = JSON.stringify(payloadObj)

  // 🚫 évite save inutile
  if (payload === lastSavedRef.current) return

  try {
    setSaving(true)

    const { error } = await supabase
      .from("pearls")
      .update({
        ...payloadObj,
        tags: normalizedTags.join(" ")
      })
      .eq("id", id)

    if (error) throw error

    // ✅ sync parfaite avec ce qu’on compare
    lastSavedRef.current = payload

  } catch (err) {
    console.error("Save error:", err)
    alert("Erreur sauvegarde")
  } finally {
    setSaving(false)
  }
}

///////////////////////
// DELETE PEARL
///////////////////////

async function deletePearl() {
  if (!id) return

  const confirmed = confirm("Supprimer cette perle ?")
  if (!confirmed) return

  try {
    const { error } = await supabase
      .from("pearls")
      .delete()
      .eq("id", id)

    if (error) throw error

    router.push("/library")

  } catch (err) {
    console.error("Delete error:", err)
    alert("Erreur lors de la suppression")
  }
}



  /* TAGS */

  function addTag(){

  if(!tagInput.trim()) return

  if(tags.includes(tagInput.trim())) return

  setTags(prev => {
  const updated = [...prev, tagInput.trim()]
  queueMicrotask(() => triggerSave())
  return updated
})
  setTagInput("")

  }


  function removeTag(tag:string){

  setTags(prev => {
  const updated = prev.filter(t => t !== tag)
  setTimeout(() => triggerSave(), 0)
  return updated
})

  }



  /* LOADING */

  if(loading){
  return(
  <div className="h-screen flex items-center justify-center text-neutral-500">
  Chargement…
  </div>
  )
  }



  /* UI */

  return(

  <main className="max-w-2xl mx-auto px-6 pt-10 pb-40">



  {/* HEADER */}

  <div className="flex items-center justify-between mb-10">

  <button
  onClick={async ()=>{

    await savePearl()   // 🔥 sauvegarde forcée

    router.push("/library")
  }}
  className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white"
  >
  <ArrowLeft size={16}/>
  Bibliothèque
  </button>


  <div className="flex items-center gap-3">

  <span className="text-xs">
    {status === "saving" && (
      <span className="text-neutral-500">Saving…</span>
    )}

    {status === "saved" && (
      <span className="text-green-400">✓ Saved</span>
    )}
  </span>
  
  <button
  onClick={savePearl}
  className="text-sm px-3 py-1.5 rounded-md border border-neutral-800 hover:bg-neutral-900 flex items-center gap-1"
  >
  <Save size={14}/>
  Save
  </button>

  <button
  onClick={deletePearl}
  className="text-sm px-3 py-1.5 rounded-md border border-red-800 text-red-400 hover:bg-red-900/20 flex items-center gap-1"
  >
  <Trash2 size={14}/>
  Delete
  </button>

  </div>

  </div>



  {/* META GRID */}

  <div className="grid sm:grid-cols-2 gap-4 mb-8 text-sm">

  <input
  value={source}
  onChange={(e)=>{
  setSource(e.target.value)
  triggerSave()
}}
  placeholder="Auteur"
  className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
  />


  <input
  value={theme}
  onChange={(e)=>{
  setTheme(e.target.value)
  triggerSave()
}}
  placeholder="Thème"
  className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
  />


  <div className="sm:col-span-2 flex items-center gap-2">

  <input
  value={link}
  onChange={(e)=>{
  setLink(e.target.value)
  triggerSave()
}}
  placeholder="Lien"
  className="flex-1 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
  />

  {link &&(

<a
  href={link}
  target="_blank"
  rel="noopener noreferrer"
  >
  <ExternalLink size={16}/>
  </a>

  )}

  </div>

  </div>



  {/* TAGS */}

  <div className="mb-8">

  <div className="flex flex-wrap gap-2 mb-2">

  {tags.map((tag,i)=>(

  <div
  key={i}
  className="flex items-center gap-1 bg-neutral-800 text-xs px-2.5 py-1 rounded-md"
  >

  #{tag}

  <button
  onClick={()=>removeTag(tag)}
  className="opacity-60 hover:opacity-100"
  >
  <X size={12}/>
  </button>

  </div>

  ))}

  </div>


  <input
  value={tagInput}
  onChange={(e)=>setTagInput(e.target.value)}
  onKeyDown={(e)=>{

  if(e.key === "Enter"){
  e.preventDefault()
  addTag()
  }

  }}
  placeholder="Ajouter un tag et appuyer sur Entrée"
  className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600 text-sm"
  />

  </div>



  {/* CONTENT */}

  {/* TOOLBAR */}

  <div className="flex items-center gap-1 mb-4 px-2 py-1.5 bg-neutral-900/60 border border-neutral-800 rounded-lg w-fit">

    <button
      onMouseDown={(e)=>{e.preventDefault(); document.execCommand("bold")}}
      className="px-2 py-1 text-sm rounded hover:bg-neutral-700"
    >
      B
    </button>

    <button
      onMouseDown={(e)=>{e.preventDefault(); document.execCommand("italic")}}
      className="px-2 py-1 text-sm rounded hover:bg-neutral-700 italic"
    >
      I
    </button>

    <button
      onMouseDown={(e)=>{e.preventDefault(); document.execCommand("underline")}}
      className="px-2 py-1 text-sm rounded hover:bg-neutral-700 underline"
    >
      U
    </button>

    <div className="w-px h-4 bg-neutral-700 mx-1" />

    <button
      onMouseDown={(e)=>{
        e.preventDefault()

        const selection = window.getSelection()
        if (!selection || selection.rangeCount === 0) return

        const parent = selection.anchorNode?.parentElement

        // toggle highlight
        if (parent && parent.style.backgroundColor) {
          document.execCommand("hiliteColor", false, "transparent")
        } else {
          document.execCommand("hiliteColor", false, "#fef08a")
        }
      }}
      className="px-2 py-1 text-sm rounded hover:bg-neutral-700"
    >
      <span className="bg-yellow-200 text-black px-1 rounded">A</span>
    </button>

  </div>

<div
  ref={editorRef}
  contentEditable
  suppressContentEditableWarning
  onBlur={() => savePearl()}
  onInput={(e) => {
    const html = e.currentTarget.innerHTML

    if (html !== content) {
      setContent(html)
      triggerSave()
    }
  }}
  className="
    w-full
    text-[15px]
    leading-relaxed
    bg-transparent
    outline-none
    min-h-[200px]
    whitespace-pre-wrap
    text-neutral-100
    [&_span[style*='background-color']]:text-neutral-900
  "
/>



  </main>

  )

  }