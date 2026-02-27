"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type Book = {
  id: string
  title: string
  description: string | null
  created_at: string
}

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  async function fetchBooks() {
    setLoading(true)

    const { data } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false })

    setBooks(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchBooks()
  }, [])

  async function handleCreateBook(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)

    const { error } = await supabase.from("books").insert([
      { title, description },
    ])

    if (!error) {
      setTitle("")
      setDescription("")
      setShowForm(false)
      await fetchBooks()
    }

    setCreating(false)
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">

      {/* HEADER */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-10 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Librophoto
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Capture les passages qui comptent.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="px-5 py-3 bg-white text-black rounded-2xl font-medium hover:scale-[1.03] transition"
        >
          {showForm ? "Annuler" : "➕ Nouveau"}
        </button>
      </header>

      {/* CREATE FORM (Animated reveal style) */}
      {showForm && (
        <section className="max-w-4xl mx-auto px-6 pb-12">
          <form
            onSubmit={handleCreateBook}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 space-y-5"
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

            <button
              type="submit"
              disabled={creating}
              className="w-full px-6 py-3 bg-white text-black rounded-xl font-semibold hover:scale-[1.02] transition disabled:opacity-50"
            >
              {creating ? "Création..." : "Créer le livre"}
            </button>
          </form>
        </section>
      )}

      {/* BOOK LIST */}
      <section className="max-w-6xl mx-auto px-6 pb-24">

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
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {books.map((book) => (
              <Link
                key={book.id}
                href={`/books/${book.id}`}
                className="group relative bg-neutral-900 border border-neutral-800 rounded-3xl p-6 hover:border-neutral-600 hover:-translate-y-1 transition-all duration-300"
              >
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition" />

                <h3 className="text-lg font-semibold mb-2 relative z-10">
                  {book.title}
                </h3>

                {book.description && (
                  <p className="text-sm text-neutral-400 mb-6 line-clamp-2 relative z-10">
                    {book.description}
                  </p>
                )}

                <div className="flex justify-between items-center text-xs text-neutral-500 relative z-10">
                  <span>
                    {new Date(book.created_at).toLocaleDateString()}
                  </span>
                  <span className="group-hover:text-white transition">
                    Ouvrir →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

    </main>
  )
}