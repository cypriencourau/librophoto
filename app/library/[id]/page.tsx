"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Save, Trash2, ExternalLink, X } from "lucide-react"

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

const textareaRef = useRef<HTMLTextAreaElement>(null)
const loadedRef = useRef(false)



/* LOAD */

useEffect(()=>{
if(id) loadPearl()
},[id])


async function loadPearl(){

const {data,error} = await supabase
.from("pearls")
.select("*")
.eq("id",id)
.single()

if(error){
console.error(error)
return
}

setContent(data.content || "")
setSource(data.source || "")
setTheme(data.theme || "")
setLink(data.link || "")

if(data.tags){
setTags(data.tags.split(" ").filter((t:string)=>t))
}

setLoading(false)

}



/* AUTOSAVE */

useEffect(()=>{

if(!id) return
if(!loadedRef.current) return

const timeout = setTimeout(()=>{
savePearl()
},1500)

return ()=>clearTimeout(timeout)

},[content,source,theme,tags,link])



/* SAVE */

async function savePearl(){

if(!id) return

setSaving(true)

const { error } = await supabase
.from("pearls")
.update({
content,
source,
theme,
tags: tags.join(" "),
link
})
.eq("id",id)

setSaving(false)

if(error){
console.error(error)
alert("Erreur sauvegarde")
return
}


}


/* DELETE */

async function deletePearl(){

const ok = confirm("Supprimer cette perle ?")

if(!ok) return

await supabase
.from("pearls")
.delete()
.eq("id",id)

router.push("/library")

}



/* AUTO RESIZE */

useEffect(()=>{

const el = textareaRef.current
if(!el) return

el.style.height = "auto"
el.style.height = el.scrollHeight + "px"

},[content])



/* TAGS */

function addTag(){

if(!tagInput.trim()) return

if(tags.includes(tagInput.trim())) return

setTags([...tags,tagInput.trim()])
setTagInput("")

}


function removeTag(tag:string){

setTags(tags.filter(t => t !== tag))

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
onClick={()=>router.push("/library")}
className="flex items-center gap-2 text-sm text-neutral-500 hover:text-white"
>
<ArrowLeft size={16}/>
Bibliothèque
</button>


<div className="flex items-center gap-3">

{saving &&(
<span className="text-xs text-neutral-500">
Saving…
</span>
)}

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
onChange={(e)=>setSource(e.target.value)}
placeholder="Auteur"
className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
/>


<input
value={theme}
onChange={(e)=>setTheme(e.target.value)}
placeholder="Thème"
className="px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
/>


<div className="sm:col-span-2 flex items-center gap-2">

<input
value={link}
onChange={(e)=>setLink(e.target.value)}
placeholder="Lien"
className="flex-1 px-3 py-2 rounded-md bg-neutral-900 border border-neutral-800 focus:outline-none focus:border-neutral-600"
/>

{link &&(

<a
href={link}
target="_blank"
className="text-neutral-500 hover:text-white"
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

<textarea
ref={textareaRef}
value={content}
onChange={(e)=>setContent(e.target.value)}
placeholder="Écrire la citation ou l'anecdote…"
className="
w-full
text-lg
leading-loose
bg-transparent
resize-none
outline-none
overflow-hidden
placeholder:text-neutral-600
"
/>



</main>

)

}