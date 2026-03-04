"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { X } from "lucide-react"

type Book = {
  id: string
  title: string
  description: string | null
  created_at: string
  cover?: string | null
}

export default function Home() {
  const [monthlyOCR, setMonthlyOCR] = useState(0)
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  async function fetchBooks() {
    try {
      setLoading(true)

    const { data, error } = await supabase
      .from("books")
      .select(`
        *,
        captures (
          image_url
        )
      `)
      .order("created_at", { ascending: false })

      if (error) throw error

    const booksWithCover = (data || []).map((book: any) => ({
      ...book,
      cover: book.captures?.[0]?.image_url || null
    }))

    setBooks(booksWithCover)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  useEffect(() => {
  async function fetchOCRStats() {
    try {
      const res = await fetch("/api/ocr/stats")
      const data = await res.json()
      setMonthlyOCR(data.count || 0)
    } catch (err) {
      console.error("Erreur OCR stats", err)
    }
  }

  fetchOCRStats()
}, [])

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    try {
      setCreating(true)

      const { data, error } = await supabase
        .from("books")
        .insert([{ title, description }])
        .select()
        .single()

      if (error) throw error

      // Optimistic update
      setBooks((prev) => [data, ...prev])

      setTitle("")
      setDescription("")
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setCreating(false)
    }
  }

  async function handleDeleteBook(id: string) {
    if (!confirm("Supprimer ce livre ?")) return

    try {
      setDeletingId(id)

      const { error } = await supabase
        .from("books")
        .delete()
        .eq("id", id)

      if (error) throw error

      setBooks((prev) => prev.filter((book) => book.id !== id))
    } catch (err) {
      console.error(err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white overflow-x-hidden flex flex-col">

      {/* HEADER */}
<header className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/60 backdrop-blur-xl border-b border-white/10">
  <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between gap-4">

  <div>
    <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
      Librophoto 
    </h1>
    <p className="text-neutral-400 mt-2 text-sm md:text-base">
      Capture les passages qui comptent.
    </p>
  </div>

  <div className="flex flex-col items-end gap-3">

    <button
      onClick={() => setShowForm((prev) => !prev)}
      className="px-4 py-2 md:px-6 md:py-3 bg-white text-black rounded-xl md:rounded-2xl text-sm md:text-base font-medium hover:scale-[1.03] active:scale-95 transition"
    >
      {showForm ? "Annuler" : "➕ Nouveau"}
    </button>

    {/* Compteur OCR */}
    <div className="w-full max-w-[220px]">
      <div className="flex justify-between items-center text-[11px] text-neutral-400 mb-1">
        <span>{monthlyOCR} / 1000 OCR</span>
        <span>{Math.min(Math.round((monthlyOCR / 1000) * 100), 100)}%</span>
      </div>

      <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            monthlyOCR > 800
              ? "bg-orange-400"
              : monthlyOCR > 950
              ? "bg-red-500"
              : "bg-white"
          }`}
          style={{
            width: `${Math.min((monthlyOCR / 1000) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  </div>
  </div>
</header>

      {/* CREATE FORM */}
      {showForm && (
  <div
    onClick={() => setShowForm(false)}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
  >
    <div
      onClick={(e) => e.stopPropagation()}
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
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white"
        />

        <textarea
          placeholder="Description (optionnelle)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white"
        />

        <div className="flex gap-3 pt-2">

          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="flex-1 py-3 bg-neutral-800 rounded-xl"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={creating}
            className="flex-1 py-3 bg-white text-black rounded-xl font-semibold disabled:opacity-50"
          >
            {creating ? "Création..." : "Créer"}
          </button>

        </div>

      </form>
    </div>
  </div>
)}

      {/* BOOK LIST */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-40 pb-10">

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-lg font-semibold">
            Vos livres
          </h2>

          {!loading && (
            <span className="text-sm text-neutral-500">
              {books.length} {books.length > 1 ? "livres" : "livre"}
            </span>
          )}
        </div>

        {loading ? (
          <div className="text-neutral-500 animate-pulse">
            Chargement...
          </div>
        ) : books.length === 0 ? (
          <div className="border border-neutral-800 bg-neutral-900 rounded-3xl p-16 text-center text-neutral-500">
            <p className="mb-4 text-lg">
              Aucun livre pour le moment.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-white text-black rounded-xl font-medium"
            >
              Créer votre premier livre
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {books.map((book) => (
              <div
                key={book.id}
                className="group relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col hover:border-neutral-600 hover:-translate-y-1 hover:shadow-xl transition-all duration-300"
              >
                {/* Delete */}
            <button
              onClick={() => handleDeleteBook(book.id)}
              disabled={deletingId === book.id}
              className="absolute top-3 right-3 z-20 p-1 text-neutral-400 hover:text-red-500 transition"
            >
                  {deletingId === book.id ? "…" : <X size={16} />}
                </button>

                <Link href={`/books/${book.id}`}>
                {book.cover && (
                <div className="aspect-[3/4] w-full overflow-hidden">
                  <img
                    src={book.cover}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    alt=""
                  />
                </div>
              )}
                 <div className="p-4 md:p-5 flex flex-col flex-1">

        <div>
          <h3 className="text-sm md:text-lg font-semibold mb-1">
            {book.title}
          </h3>

          {book.description && (
            <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
              {book.description}
            </p>
          )}
        </div>

        <div className="flex justify-between items-center text-xs text-neutral-500 mt-auto pt-4">
          <span>
            {new Date(book.created_at).toLocaleDateString()}
          </span>
          <span className="group-hover:text-white transition">
            Ouvrir →
          </span>
        </div>

      </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}