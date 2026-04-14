"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { X, Plus } from "lucide-react"

type Book = {
  id: string
  title: string
  description: string | null
  created_at: string
  cover?: string | null
}

export default function BooksPage() {

  const [books,setBooks] = useState<Book[]>([])
  const [monthlyOCR,setMonthlyOCR] = useState(0)

  const [loading,setLoading] = useState(true)
  const [creating,setCreating] = useState(false)
  const [showForm,setShowForm] = useState(false)
  const [deletingId,setDeletingId] = useState<string | null>(null)

  const [title,setTitle] = useState("")
  const [description,setDescription] = useState("")

  useEffect(()=>{
    fetchBooks()
    fetchOCRStats()
  },[])

  async function fetchBooks(){

    try{

      setLoading(true)

      const {data,error} = await supabase
        .from("books")
        .select(`
          *,
          captures (
            image_url
          )
        `)
        .order("created_at",{ascending:true})

      if(error) throw error

      const booksWithCover = (data || []).map((book:any)=>({
        ...book,
        cover: book.cover || book.captures?.[0]?.image_url || null
      }))

      setBooks(booksWithCover)

    }catch(err){
      console.error(err)
    }finally{
      setLoading(false)
    }

  }

  async function fetchOCRStats(){

    try{

      const res = await fetch("/api/ocr/stats")
      const data = await res.json()

      setMonthlyOCR(data.count || 0)

    }catch(err){
      console.error(err)
    }

  }

  async function handleCreateBook(e:React.FormEvent){

    e.preventDefault()

    if(!title.trim()) return

    try{

      setCreating(true)

      const {data,error} = await supabase
        .from("books")
        .insert([{title,description}])
        .select()
        .single()

      if(error) throw error

      setBooks(prev => [data,...prev])

      setTitle("")
      setDescription("")
      setShowForm(false)

    }catch(err){
      console.error(err)
    }finally{
      setCreating(false)
    }

  }

  async function handleDeleteBook(id:string){

    if(!confirm("Supprimer ce livre ?")) return

    try{

      setDeletingId(id)

      const {error} = await supabase
        .from("books")
        .delete()
        .eq("id",id)

      if(error) throw error

      setBooks(prev => prev.filter(book => book.id !== id))

    }catch(err){
      console.error(err)
    }finally{
      setDeletingId(null)
    }

  }

  return (

<main className="max-w-6xl mx-auto px-6 pt-20 pb-32">

{/* HEADER */}

<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-12">

<div>

<h1 className="text-4xl font-bold tracking-tight">
Livres
</h1>

<p className="text-neutral-400 mt-2">
Scanner des pages et extraire des passages avec OCR
</p>

</div>

<button
onClick={()=>setShowForm(true)}
className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-xl font-medium hover:scale-[1.03] active:scale-95 transition"
>
<Plus size={18}/>
Nouveau livre
</button>

</div>

{/* OCR STATS */}

<div className="mb-12 max-w-sm">

<div className="flex justify-between text-xs text-neutral-400 mb-2">

<span>{monthlyOCR} / 1000 OCR</span>

<span>{Math.min(Math.round((monthlyOCR/1000)*100),100)}%</span>

</div>

<div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">

<div
className="h-full bg-white transition-all duration-500"
style={{
width:`${Math.min((monthlyOCR/1000)*100,100)}%`
}}
/>

</div>

</div>

{/* CONTENT */}

{loading ? (

<div className="text-neutral-500 animate-pulse">
Chargement...
</div>

) : books.length === 0 ? (

<div className="border border-neutral-800 bg-neutral-900 rounded-2xl p-16 text-center text-neutral-500">

<p className="mb-4 text-lg">
Aucun livre pour le moment
</p>

<button
onClick={()=>setShowForm(true)}
className="px-6 py-3 bg-white text-black rounded-xl font-medium"
>
Créer votre premier livre
</button>

</div>

) : (

<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">

{books.map((book) => (

<div
key={book.id}
className="group relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden hover:border-neutral-600 transition"
>

<button
onClick={() => handleDeleteBook(book.id)}
disabled={deletingId === book.id}
className="absolute top-2 right-2 z-20 p-1 text-neutral-400 hover:text-red-500"
>
{deletingId === book.id ? "…" : <X size={14} />}
</button>

<Link href={`/books/${book.id}`}>

<div className="relative aspect-3/4 w-full overflow-hidden">

{book.cover ? (

<img
src={book.cover}
className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
/>

) : (

<div className="w-full h-full flex items-center justify-center bg-neutral-800 text-neutral-500 text-sm">
No cover
</div>

)}

{/* gradient */}

<div className="absolute inset-0 bg-gradient-to-top from-black/80 via-black/30 to-transparent" />

{/* title overlay */}

<div className="absolute bottom-0 left-0 right-0 p-3">

<h3 className="text-sm font-semibold leading-tight line-clamp-2 text-white">
{book.title}
</h3>

<div className="text-[11px] text-neutral-300 mt-1">
{new Date(book.created_at).toLocaleDateString()}
</div>

</div>

</div>

</Link>

</div>

))}

</div>

)}

{/* CREATE MODAL */}

{showForm && (

<div
onClick={()=>setShowForm(false)}
className="fixed inset-0 bg-black/60 backdrop-blur flex items-center justify-center z-50"
>

<div
onClick={(e)=>e.stopPropagation()}
className="w-[90%] max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6"
>

<h2 className="text-lg font-semibold mb-4">
Nouveau livre
</h2>

<form
onSubmit={handleCreateBook}
className="space-y-4"
>

<input
type="text"
placeholder="Titre du livre"
value={title}
onChange={(e)=>setTitle(e.target.value)}
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<textarea
placeholder="Description (optionnelle)"
value={description}
onChange={(e)=>setDescription(e.target.value)}
rows={3}
className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3"
/>

<div className="flex gap-3 pt-2">

<button
type="button"
onClick={()=>setShowForm(false)}
className="flex-1 py-3 bg-neutral-800 rounded-xl"
>
Annuler
</button>

<button
type="submit"
disabled={creating}
className="flex-1 py-3 bg-white text-black rounded-xl font-semibold"
>
{creating ? "Création..." : "Créer"}
</button>

</div>

</form>

</div>

</div>

)}

</main>

  )

}