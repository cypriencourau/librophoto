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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  async function fetchBooks() {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from("books")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      setBooks(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBooks()
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
    <main className="min-h-screen bg-neutral-950 text-white">

      {/* HEADER */}
      <header className="max-w-6xl mx-auto px-6 pt-16 pb-12 flex justify-between items-center">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Librophoto
          </h1>
          <p className="text-neutral-400 mt-2 text-sm md:text-base">
            Capture les passages qui comptent. 📖📸
          </p>
        </div>

        <button
          onClick={() => setShowForm((prev) => !prev)}
          className="px-6 py-3 bg-white text-black rounded-2xl font-medium hover:scale-[1.03] active:scale-95 transition"
        >
          {showForm ? "Annuler" : "➕ Nouveau"}
        </button>
      </header>

      {/* CREATE FORM */}
      {showForm && (
        <section className="max-w-4xl mx-auto px-6 pb-14">
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
              className="w-full px-6 py-3 bg-white text-black rounded-xl font-semibold hover:scale-[1.02] active:scale-95 transition disabled:opacity-50"
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
              <div
                key={book.id}
                className="group relative bg-neutral-900 border border-neutral-800 rounded-3xl p-6 hover:border-neutral-600 hover:-translate-y-1 transition-all duration-300"
              >
                {/* Delete */}
                <button
                  onClick={() => handleDeleteBook(book.id)}
                  disabled={deletingId === book.id}
                  className="absolute top-4 right-4 text-neutral-500 hover:text-red-500 transition"
                >
                  {deletingId === book.id ? "…" : "✕"}
                </button>

                <Link href={`/books/${book.id}`}>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {book.title}
                    </h3>

                    {book.description && (
                      <p className="text-sm text-neutral-400 mb-6 line-clamp-2">
                        {book.description}
                      </p>
                    )}

                    <div className="flex justify-between items-center text-xs text-neutral-500">
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