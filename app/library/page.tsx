"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Search, Plus } from "lucide-react"
import Link from "next/link"

type Pearl = {
  id: string
  content: string
  source: string | null
  tags: string | null
}

export default function Library(){

const [pearls,setPearls] = useState<Pearl[]>([])
const [tags,setTags] = useState<string[]>([])
const [tagSearch,setTagSearch] = useState("")
const filteredTagSuggestions = tags
  .filter(tag =>
    tag.toLowerCase().includes(tagSearch.toLowerCase())
  )
  .slice(0, 8)

const [search,setSearch] = useState("")
const [activeTags,setActiveTags] = useState<string[]>([])

const [loading,setLoading] = useState(true)
const PAGE_SIZE = 40

const [page,setPage] = useState(1)
const [total,setTotal] = useState(0)

const [showForm,setShowForm] = useState(false)

const [content,setContent] = useState("")
const [source,setSource] = useState("")
const [tagInput,setTagInput] = useState("")



/* TAG TOGGLE */

function toggleTag(tag:string){

setPage(1)

if(activeTags.includes(tag)){
setActiveTags(activeTags.filter(t => t !== tag))
}else{
setActiveTags([...activeTags,tag])
}

}



/* LOAD PEARLS */

useEffect(()=>{
loadPearls()
},[search,activeTags,page])


async function loadPearls(){

setLoading(true)

const from = (page - 1) * PAGE_SIZE
const to = from + PAGE_SIZE - 1

let query = supabase
.from("pearls")
.select("id,content,source,tags,created_at", { count: "exact" })
.order("created_at",{ascending:false})

/* SEARCH */

if(search){

query = query.or(`
content.ilike.%${search}%,
tags.ilike.%${search}%
`)

}

/* TAG FILTER */

if(activeTags.length > 0){

activeTags.forEach(tag=>{

query = query.ilike("tags", `%${tag}%`)

})

}

/* PAGINATION */

query = query.range(from,to)

const {data,error,count} = await query

if(error){
console.error(error)
setLoading(false)
return
}

setPearls(data || [])
setTotal(count || 0)

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

const tagSet = new Set<string>()

data?.forEach(p=>{


if(p.tags){
p.tags.split(" ").forEach((t:string)=>{
if(t.trim()) tagSet.add(t)
})
}

})

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
tags:tagInput
})
.select()
.single()

if(error){
console.error(error)
return
}


setContent("")
setSource("")
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
onChange={(e)=>{
setSearch(e.target.value)
setPage(1)
}}
placeholder="Rechercher une citation..."
className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3"
/>

</div>



{/* TAG SEARCH */}
<div className="mb-10 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4">

  <div className="text-sm text-white mb-3 font-semibold">
    Filtrer par tag
  </div>

  {/* INPUT */}
  <div className="relative">
    <Search size={16} className="absolute left-3 top-2.5 text-neutral-500" />

    <input
      value={tagSearch}
      onChange={(e)=>setTagSearch(e.target.value)}
      placeholder="Ex: vocation, silence..."
      className="w-full bg-black border border-white/20 rounded-xl pl-10 pr-4 py-3 text-sm"
    />
  </div>

  {/* SUGGESTIONS */}
  {tagSearch && filteredTagSuggestions.length > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {filteredTagSuggestions.map(tag => (
        <button
          key={tag}
          onClick={()=>{
            toggleTag(tag)
            setTagSearch("")
          }}
          className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 hover:bg-white hover:text-black text-xs rounded-full"
        >
          #{tag}
        </button>
      ))}
    </div>
  )}

  {/* TAGS ACTIFS */}
  {activeTags.length > 0 && (
    <div className="flex flex-wrap gap-2 mt-3">
      {activeTags.map(tag => (
        <div
          key={tag}
          className="flex items-center gap-1 px-3 py-1 bg-white text-black text-xs rounded-full"
        >
          #{tag}
          <button onClick={()=>toggleTag(tag)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )}

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
<div
  className="text-[15px] leading-relaxed line-clamp-5 whitespace-pre-wrap mb-5 text-neutral-100 [&_*]:inline"
  dangerouslySetInnerHTML={{ __html: p.content }}
/>
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

{Math.ceil(total / PAGE_SIZE) > 1 && (

<div className="flex justify-center gap-2 mt-10 flex-wrap">

{Array.from(
{ length: Math.ceil(total / PAGE_SIZE) },
(_,i)=>{

const p = i + 1

return(

<button
key={p}
onClick={()=>setPage(p)}
className={`
px-3 py-1.5 rounded-lg text-sm transition
${page === p
? "bg-white text-black"
: "bg-neutral-900 border border-neutral-800 text-white hover:border-neutral-600"}
`}
>
{p}
</button>

)

})}

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