"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { BookOpen, Library, Sparkles } from "lucide-react"

type Pearl = {
  id: string
  content: string
  source: string | null
  theme: string | null
}

export default function Home() {

  const [pearls,setPearls] = useState<Pearl[]>([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    fetchPearls()
  },[])

  async function fetchPearls(){

    const {data,error} = await supabase
      .from("pearls")
      .select("id,content,source,theme")
      .order("created_at",{ascending:false})
      .limit(6)

    if(error){
      console.error(error)
      return
    }

    setPearls(data || [])
    setLoading(false)

  }

  return (

<main className="max-w-6xl mx-auto px-5 sm:px-6 pt-14 sm:pt-20 pb-28">

{/* HERO */}

<section className="mb-14 sm:mb-16">

<div className="flex items-center gap-3 mb-4">

<div className="p-2 bg-neutral-900 border border-neutral-800 rounded-lg">
<Sparkles size={20}/>
</div>

<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
Enodia
</h1>

</div>

<p className="text-neutral-400 max-w-xl leading-relaxed text-sm sm:text-base">

Capture les passages qui comptent.  
Construis ta bibliothèque personnelle de citations, idées et passages spirituels.

</p>

</section>

{/* QUICK ACTIONS */}

<section className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-16 sm:mb-20">

<Link
href="/library"
className="group bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 hover:border-neutral-600 transition active:scale-[0.98]"
>

<div className="flex items-center gap-3 mb-3">

<div className="p-2 bg-neutral-800 rounded-lg">
<Library size={20}/>
</div>

<h2 className="text-base sm:text-lg font-semibold">
Bibliothèque
</h2>

</div>

<p className="text-neutral-400 text-sm leading-relaxed">

Explorer ta collection de citations, idées et passages.

</p>

</Link>

<Link
href="/books"
className="group bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 hover:border-neutral-600 transition active:scale-[0.98]"
>

<div className="flex items-center gap-3 mb-3">

<div className="p-2 bg-neutral-800 rounded-lg">
<BookOpen size={20}/>
</div>

<h2 className="text-base sm:text-lg font-semibold">
Livres OCR
</h2>

</div>

<p className="text-neutral-400 text-sm leading-relaxed">

Scanner des pages et extraire du texte automatiquement.

</p>

</Link>

</section>

{/* DERNIERES PERLES */}

<section>

<div className="flex items-center justify-between mb-6 sm:mb-8">

<h2 className="text-xl sm:text-2xl font-semibold">
Dernières perles
</h2>

<Link
href="/library"
className="text-xs sm:text-sm text-neutral-400 hover:text-white transition"
>
Voir tout
</Link>

</div>

{loading ? (

<div className="text-neutral-500">
Chargement...
</div>

) : pearls.length === 0 ? (

<div className="text-neutral-500">
Aucune perle pour le moment.
</div>

) : (

<div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">

{pearls.map(pearl => (

<div
key={pearl.id}
className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-600 transition"
>

<p
  className="text-sm leading-relaxed mb-3 line-clamp-4 [&_span[style*='background-color']]:text-black"
  dangerouslySetInnerHTML={{ __html: pearl.content }}
/>

{pearl.source &&(

<p className="text-xs text-neutral-400">

— {pearl.source}

</p>

)}

{pearl.theme &&(

<div className="text-xs text-neutral-500 mt-3">

{pearl.theme}

</div>

)}

</div>

))}

</div>

)}

</section>

</main>

  )

}