"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Search, Plus } from "lucide-react"
import Link from "next/link"

type Pearl = {
  id: string
  content: string
  source: string | null
  theme: string | null
  tags: string | null
}

export default function Library(){

const [pearls,setPearls] = useState<Pearl[]>([])
const [themes,setThemes] = useState<string[]>([])
const [tags,setTags] = useState<string[]>([])

const [search,setSearch] = useState("")
const [activeTheme,setActiveTheme] = useState<string | null>(null)
const [activeTags,setActiveTags] = useState<string[]>([])

const [loading,setLoading] = useState(true)

const [showForm,setShowForm] = useState(false)

const [content,setContent] = useState("")
const [source,setSource] = useState("")
const [theme,setTheme] = useState("")
const [tagInput,setTagInput] = useState("")



/* TAG TOGGLE */

function toggleTag(tag:string){

if(activeTags.includes(tag)){
setActiveTags(activeTags.filter(t => t !== tag))
}else{
setActiveTags([...activeTags,tag])
}

}



/* LOAD PEARLS */

useEffect(()=>{
loadPearls()
},[search,activeTheme,activeTags])


async function loadPearls(){

setLoading(true)

let query = supabase
.from("pearls")
.select("id,content,source,theme,tags,created_at")
.order("created_at",{ascending:false})
.limit(80)

if(activeTheme){
query = query.eq("theme",activeTheme)
}

if(search){
query = query.ilike("content",`%${search}%`)
}

const {data,error} = await query

if(error){
console.error(error)
return
}

let list = data || []

if(activeTags.length > 0){

list = list.filter(p=>{

if(!p.tags) return false

const pearlTags = p.tags.split(" ")

return activeTags.every(tag => pearlTags.includes(tag))

})

}

setPearls(list)
setLoading(false)

}



/* LOAD FILTERS */

useEffect(()=>{
loadFilters()
},[])

async function loadFilters(){

const {data,error} = await supabase
.from("pearls")
.select("theme,tags")

if(error){
console.error(error)
return
}

const themeSet = new Set<string>()
const tagSet = new Set<string>()

data?.forEach(p=>{

if(p.theme){
themeSet.add(p.theme)
}

if(p.tags){
p.tags.split(" ").forEach((t:string)=>{
if(t.trim()) tagSet.add(t)
})
}

})

setThemes(Array.from(themeSet).sort())
setTags(Array.from(tagSet).sort())

}



/* CREATE */

async function createPearl(){

if(!content.trim()) return

const {data,error} = await supabase
.from("pearls")
.insert({
content,
source,
theme,
tags:tagInput
})
.select()
.single()

if(error){
console.error(error)
return
}

setPearls(prev => [data,...prev])
if(theme && !themes.includes(theme)){
setThemes(prev => [...prev,theme])
}

setContent("")
setSource("")
setTheme("")
setTagInput("")
setShowForm(false)

loadFilters()

}



/* DELETE */

async function deletePearl(id:string){

if(!confirm("Supprimer cette citation ?")) return

await supabase
.from("pearls")
.delete()
.eq("id",id)

setPearls(prev => prev.filter(p=>p.id !== id))

}



return(

<main className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-32">



{/* HEADER */}

<div className="flex items-center justify-between mb-10">

<h1 className="text-3xl font-semibold">
Bibliothèque
</h1>

<button
onClick={()=>setShowForm(true)}
className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-xl text-sm"
>
<Plus size={16}/>
Ajouter
</button>

</div>



{/* SEARCH */}

<div className="relative mb-8">

<Search size={18} className="absolute left-3 top-3 text-neutral-500"/>

<input
value={search}
onChange={(e)=>setSearch(e.target.value)}
placeholder="Rechercher une citation..."
className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3"
/>

</div>



{/* THEMES */}

<div className="flex flex-wrap items-center gap-2 mb-8">

<button
onClick={()=>setActiveTheme(null)}
className={`text-[13px] px-3 py-1.5 rounded-full border ${
!activeTheme ? "bg-white text-black" : "border-neutral-800"
}`}
>
Tous
</button>

{themes.map(t => (

<div
key={t}
className={`flex items-center gap-1 text-[13px] px-3 py-1.5 rounded-full border ${
activeTheme === t
? "bg-white text-black"
: "border-neutral-800"
}`}
>

<button

onTouchStart={(e)=>{

const timeout = setTimeout(()=>{

if(confirm(`Supprimer le thème "${t}" ?`)){
setThemes(prev => prev.filter(x => x !== t))
}

},700)

e.currentTarget.dataset.timeout = String(timeout)

}}

onTouchEnd={(e)=>{
clearTimeout(Number(e.currentTarget.dataset.timeout))
}}

onClick={()=>setActiveTheme(t)}

onContextMenu={(e)=>{
e.preventDefault()

if(confirm(`Supprimer le thème "${t}" ?`)){
setThemes(prev => prev.filter(x => x !== t))
}

}}

>
{t}

</button>

</div>

))}


{/* add theme */}

<button
onClick={()=>{
const name = prompt("Nouveau thème")
if(!name) return
if(themes.includes(name)) return
setThemes(prev => [...prev,name])
}}
className="text-[13px] px-3 py-1.5 rounded-full border border-neutral-700 hover:border-neutral-500"
>
+
</button>

</div>



{/* TAGS */}

<div className="flex flex-wrap gap-2 mb-10">

{tags.map(t=>(

<button
key={t}
onClick={()=>toggleTag(t)}
className={`text-[13px] px-3 py-1.5 rounded-full border transition ${
activeTags.includes(t)
? "bg-white text-black"
: "border-neutral-800 hover:border-neutral-600"
}`}
>
#{t}
</button>

))}

</div>



{/* RESULTS */}

{loading ?(

<div className="text-neutral-500">
Chargement...
</div>

): pearls.length === 0 ?(

<div className="text-neutral-500">
Aucune citation
</div>

):( 

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

{pearls.map(p=>(

<Link
href={`/library/${p.id}`}
key={p.id}
className="group flex flex-col justify-between min-h-170px bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-600 transition"
>

{/* citation */}

<p className="text-[15px] leading-relaxed line-clamp-5 whitespace-pre-wrap mb-5 text-neutral-100">
{p.content}
</p>


{/* META */}

<div
className="space-y-2"
onClick={(e)=>e.stopPropagation()}
>

{/* auteur + theme */}

<div className="flex items-center justify-between text-xs">

{p.source &&(
<span className="text-neutral-400">
— {p.source}
</span>
)}

{p.theme &&(

<button
onClick={(e)=>{
e.preventDefault()
e.stopPropagation()
setActiveTheme(p.theme!)
}}
className="px-2 py-3px rounded-md bg-neutral-800 text-neutral-300 uppercase tracking-wide text-[10px]"
>
{p.theme}
</button>

)}

</div>


{/* tags */}

{p.tags &&(

<div className="flex flex-wrap gap-1.5">

{p.tags.split(" ").map((t,i)=>(

<button
key={i}
onClick={(e)=>{
e.preventDefault()
e.stopPropagation()
toggleTag(t)
}}
className="text-[11px] text-neutral-500 hover:text-white"
>
#{t}
</button>

))}

</div>

)}




</div>

</Link>

))}

</div>

)}



{/* CREATE MODAL */}

{showForm &&(

<div
onClick={()=>setShowForm(false)}
className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50"
>

<div
onClick={(e)=>e.stopPropagation()}
className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 w-full max-w-lg"
>

<h2 className="text-lg font-semibold mb-4">
Nouvelle perle
</h2>

<textarea
value={content}
onChange={(e)=>setContent(e.target.value)}
placeholder="Citation..."
className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3"
/>

<input
value={source}
onChange={(e)=>setSource(e.target.value)}
placeholder="Auteur"
className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3"
/>

<input
value={theme}
onChange={(e)=>setTheme(e.target.value)}
placeholder="Thème"
className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-3"
/>

<input
value={tagInput}
onChange={(e)=>setTagInput(e.target.value)}
placeholder="tags : marie silence foi"
className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-3 mb-4"
/>

<div className="flex justify-end gap-2">

<button
onClick={()=>setShowForm(false)}
className="px-4 py-2 border border-neutral-700 rounded-lg text-sm"
>
Annuler
</button>

<button
onClick={createPearl}
className="px-4 py-2 bg-white text-black rounded-lg text-sm"
>
Créer
</button>

</div>

</div>

</div>

)}

</main>

)

}