"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Plus, Search, X } from "lucide-react"
import { useSearchParams } from "next/navigation"


type Pearl = {
  id: string
  content: string
  source: string | null
  theme: string | null
  tags: string[] | null
  created_at: string
}

export default function PearlsPage(){

const params = useSearchParams()

const [pearls,setPearls] = useState<Pearl[]>([])
const [filteredPearls,setFilteredPearls] = useState<Pearl[]>([])

const [themes,setThemes] = useState<string[]>([])
const [allTags,setAllTags] = useState<string[]>([])

const [search,setSearch] = useState("")
const [activeTheme,setActiveTheme] = useState<string | null>(null)
const [activeTags,setActiveTags] = useState<string[]>([])

const [loading,setLoading] = useState(true)

const [showForm,setShowForm] = useState(false)
const [content,setContent] = useState("")
const [source,setSource] = useState("")
const [theme,setTheme] = useState("")
const [tags,setTags] = useState("")
const [creating,setCreating] = useState(false)

useEffect(()=>{
fetchPearls()
fetchThemes()
},[])

useEffect(()=>{
const themeParam = params.get("theme")
if(themeParam) setActiveTheme(themeParam)
},[params])

useEffect(()=>{
filterPearls()
},[search,activeTheme,activeTags,pearls])

async function fetchPearls(){

setLoading(true)

const {data,error} = await supabase
.from("pearls")
.select("*")
.order("created_at",{ascending:false})

if(error){
console.error(error)
setLoading(false)
return
}

const list = data || []

setPearls(list)
extractTags(list)
setLoading(false)

}

async function fetchThemes(){

const {data} = await supabase
.from("themes")
.select("name")
.order("name")

if(!data) return

setThemes(data.map(t=>t.name))

}

function extractTags(list: Pearl[]) {

const tagSet = new Set<string>()

list.forEach(p => {
if (!p.tags) return

p.tags.forEach(tag => {
if (tag.trim()) tagSet.add(tag)
})
})

setAllTags(Array.from(tagSet).sort())

}

function filterPearls(){

let list = pearls

if(activeTheme){
list = list.filter(p=>p.theme === activeTheme)
}

if(activeTags.length){
list = list.filter(p =>
activeTags.every(tag => p.tags?.includes(tag))
)
}

if(search){

const words = search
.toLowerCase()
.split(" ")
.map(w => w.trim())
.filter(Boolean)

list = list.filter(p =>
words.every(word =>
p.content?.toLowerCase().includes(word) ||
(p.tags?.some(tag => tag.toLowerCase().includes(word)) ?? false) ||
p.source?.toLowerCase().includes(word) ||
p.theme?.toLowerCase().includes(word)
)
)

}

setFilteredPearls(list)

}

function toggleTag(tag: string){

setActiveTags(prev =>
prev.includes(tag)
? prev.filter(t => t !== tag)
: [...prev, tag]
)

}

async function createPearl(){

if(!content.trim()) return

try{

setCreating(true)

const {data,error} = await supabase
.from("pearls")
.insert({
content,
source,
theme,
tags: tags
  .split(" ")
  .map(t => t.trim().toLowerCase())
  .filter(Boolean)
})
.select()
.single()

if(error) throw error

if(theme){

await supabase
.from("themes")
.insert({name:theme})
.select()
.maybeSingle()

}

setPearls(prev=>[data,...prev])

setContent("")
setSource("")
setTheme("")
setTags("")
setShowForm(false)

fetchThemes()

}catch(err){
console.error(err)
}
finally{
setCreating(false)
}

}

function resetFilters(){

setSearch("")
setActiveTheme(null)
setActiveTags([])

}

return(

<main className="min-h-screen bg-neutral-950 text-white">

<div className="max-w-6xl mx-auto px-6 pt-16 pb-20">

{/* HEADER */}

<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">

<div>

<h1 className="text-4xl font-bold tracking-tight">
Perles
</h1>

<p className="text-neutral-400 mt-2">
Bibliothèque de citations
</p>

</div>

<button
onClick={()=>setShowForm(true)}
className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-xl font-medium"
>
<Plus size={18}/>
Nouvelle perle
</button>

</div>

{/* SEARCH */}

<div className="relative mb-10">

<Search
size={18}
className="absolute left-4 top-3.5 text-neutral-500"
/>

<input
placeholder="Rechercher : marie humilité fiat..."
value={search}
onChange={(e)=>setSearch(e.target.value)}
className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white"
/>

</div>

{/* THEMES */}

<div className="flex flex-wrap gap-2 mb-6">

<button
onClick={()=>setActiveTheme(null)}
className={`px-3 py-2 rounded-lg text-sm border ${
activeTheme === null
? "bg-white text-black"
: "bg-neutral-900 border-neutral-800"
}`}
>
Tous
</button>

{themes.map(t=>(

<button
key={t}
onClick={()=>setActiveTheme(t)}
className={`px-3 py-2 rounded-lg text-sm border ${
activeTheme === t
? "bg-white text-black"
: "bg-neutral-900 border-neutral-800"
}`}
>
{t}
</button>

))}

</div>

{/* TAGS */}

<div className="flex flex-wrap gap-2 mb-12">

{allTags.map(tag=>(

<button
key={tag}
onClick={()=>toggleTag(tag)}
className={`text-xs px-3 py-1 rounded-full border ${
activeTags.includes(tag)
? "bg-white text-black"
: "bg-neutral-900 border-neutral-800 text-neutral-400"
}`}
>
#{tag}
</button>

))}

</div>

{/* LIST */}

{loading ?(

<div className="text-neutral-500 animate-pulse">
Chargement...
</div>

) : filteredPearls.length === 0 ?(

<div className="border border-neutral-800 bg-neutral-900 rounded-3xl p-16 text-center text-neutral-500">

<p className="mb-4 text-lg">
Aucune perle trouvée
</p>

<button
onClick={resetFilters}
className="px-6 py-3 bg-white text-black rounded-xl"
>
Réinitialiser
</button>

</div>

):( 

<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">

{filteredPearls.map(pearl=>(

<div
key={pearl.id}
className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-600 transition"
>

<p className="text-lg leading-relaxed mb-4">
{pearl.content}
</p>

{pearl.source &&(
<p className="text-sm text-neutral-400 mb-4">
— {pearl.source}
</p>
)}

{pearl.theme &&(

<button
onClick={()=>setActiveTheme(pearl.theme)}
className="text-xs uppercase tracking-wide text-neutral-500 mb-4 hover:text-white"
>
{pearl.theme}
</button>

)}

{pearl.tags && (

<div className="flex flex-wrap gap-2">

{pearl.tags.map(tag => (
<button
key={tag}
onClick={() => toggleTag(tag)}
className="text-xs bg-neutral-800 px-2 py-1 rounded-md text-neutral-400 hover:bg-neutral-700"
>
#{tag}
</button>
))}

</div>

)}

</div>

))}

</div>

)}

</div>

{/* MODAL */}

{showForm &&(

<div
onClick={()=>setShowForm(false)}
className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50"
>

<div
onClick={(e)=>e.stopPropagation()}
className="w-[92%] max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6"
>

<div className="flex justify-between items-center mb-6">

<h2 className="text-xl font-semibold">
Nouvelle perle
</h2>

<button onClick={()=>setShowForm(false)}>
<X size={18}/>
</button>

</div>

<div className="space-y-4">

<textarea
placeholder="Citation..."
value={content}
onChange={(e)=>setContent(e.target.value)}
rows={3}
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<input
placeholder="Source"
value={source}
onChange={(e)=>setSource(e.target.value)}
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<input
placeholder="Thème"
value={theme}
onChange={(e)=>setTheme(e.target.value)}
list="themes"
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<datalist id="themes">
{themes.map(t=>(
<option key={t} value={t}/>
))}
</datalist>

<input
placeholder="Tags (ex: fiat abandon silence)"
value={tags}
onChange={(e)=>setTags(e.target.value)}
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<div className="flex gap-3 pt-4">

<button
onClick={()=>setShowForm(false)}
className="flex-1 py-3 bg-neutral-800 rounded-xl"
>
Annuler
</button>

<button
onClick={createPearl}
disabled={creating}
className="flex-1 py-3 bg-white text-black rounded-xl font-semibold"
>
{creating ? "Création..." : "Créer"}
</button>

</div>

</div>

</div>

</div>

)}

</main>

)

}