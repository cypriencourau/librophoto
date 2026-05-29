"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import BookEditor from "@/components/BookEditor"



type Note = {
  id: string
  book_id: string
  title: string
  content: string
  updated_at: string
}

export default function NotePage() {
  const params = useParams()
  const router = useRouter()

  const noteId = params?.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [note, setNote] = useState<Note | null>(null)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")

  const [showMenu, setShowMenu] = useState(false)

  const titleRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
  if (!titleRef.current) return

  titleRef.current.style.height = "auto"
  titleRef.current.style.height =
    `${titleRef.current.scrollHeight}px`
}, [title])

  async function fetchNote() {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", noteId)
        .single()

      if (error) throw error

      setNote(data)
      setTitle(data.title || "")
      setContent(data.content || "")
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function saveNote() {
    if (!note) return

    try {
      setSaving(true)

      const now = new Date().toISOString()

      const { error } = await supabase
        .from("notes")
        .update({
          title,
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("id", note.id)

      if (error) throw error
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function deleteNote() {
    if (!note) return

    const confirmed = window.confirm(
      "Supprimer définitivement cette note ?"
    )

    if (!confirmed) return

    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", note.id)

    if (error) {
      console.error(error)
      return
    }

        router.push(
      `/books/${note.book_id}?tab=notes`
    )
  }

  useEffect(() => {
    fetchNote()
  }, [noteId])

  useEffect(() => {
    if (!note) return

    const timeout = setTimeout(() => {
      saveNote()
    }, 1000)

    return () => clearTimeout(timeout)
  }, [title, content])

  const plainText = content.replace(
    /<[^>]*>/g,
    " "
  )

  const wordCount = plainText
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  const updatedDate = note?.updated_at
    ? new Date(note.updated_at).toLocaleString("fr-FR")
    : ""

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
        <div className="text-neutral-500">
          Chargement...
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">

      <header
        className="
          sticky
          top-0
          z-50
          border-b
          border-neutral-800
          bg-neutral-950/80
          backdrop-blur-2xl
        "
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">

          <button
            onClick={() =>
            note &&
            router.push(
              `/books/${note.book_id}?tab=notes`
            )
          }
            className="
            rounded-xl
            border
            border-neutral-800
            bg-neutral-900
            px-3
            sm:px-4
            py-2
            text-sm
            hover:border-neutral-700
            "
          >
            ← Retour
          </button>

          <div
            className={`text-sm ${
              saving
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {saving
              ? "Sauvegarde..."
              : "Sauvegardé"}
          </div>

          <div className="relative">

            <button
              onClick={() =>
                setShowMenu(!showMenu)
              }
              className="
                h-10
                w-10
                rounded-xl
                border
                border-neutral-800
                bg-neutral-900
                flex
                items-center
                justify-center
              "
            >
              ⋯
            </button>

            {showMenu && (
              <div
                className="
                  absolute
                  right-0
                  mt-2
                  w-56
                  rounded-2xl
                  border
                  border-neutral-800
                  bg-neutral-900
                  overflow-hidden
                  shadow-2xl
                "
              >
                <button
                  onClick={deleteNote}
                  className="
                    w-full
                    px-4
                    py-3
                    text-left
                    text-red-400
                    hover:bg-neutral-800
                  "
                >
                  Supprimer la note
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12">

        <textarea
        ref={titleRef}
          value={title}
          onChange={(e) => {
              setTitle(e.target.value)
            }}
          placeholder="Titre de la note"
          rows={1}
          className="
            w-full

            resize-none
            overflow-hidden

            bg-transparent

            text-3xl sm:text-4xl md:text-6xl
            font-bold
            tracking-tight
            leading-tight

            break-words

            outline-none

            placeholder:text-neutral-700

            mb-10
          "
        />

        <div className="max-w-3xl mx-auto">
          <BookEditor
            content={content}
            onChange={setContent}
          />
        </div>

      </div>

      <div
        className="
          hidden
          sm:block
          fixed
          bottom-6
          right-6
          rounded-2xl
          border
          border-neutral-800
          bg-neutral-900/90
          backdrop-blur-xl
          px-4
          py-3
          text-sm
          text-neutral-300
        "
      >

        <div>{wordCount} mots</div>

        <div className="text-neutral-500 mt-1">
          {updatedDate}
        </div>
      </div>

    </main>
  )
}