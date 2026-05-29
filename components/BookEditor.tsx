"use client"

import { useState } from "react"
import StarterKit from "@tiptap/starter-kit"
import Underline from "@tiptap/extension-underline"
import { EditorContent, useEditor } from "@tiptap/react"



type Props = {
  content: string
  onChange: (html: string) => void
}

function Button({
  active,
  children,
  onClick,
}: {
  active?: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        h-9
        px-3
        rounded-xl
        text-sm
        font-medium
        transition-all
        duration-200

        ${
          active
            ? "bg-white text-black"
            : "text-neutral-400 hover:text-white hover:bg-neutral-900"
        }
      `}
    >
      {children}
    </button>
  )
}

export default function BookEditor({
  content,
  onChange,
}: Props) {

const [showPearlModal, setShowPearlModal] = useState(false)
const [selectedText, setSelectedText] = useState("")
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
    ],

    content,

    immediatelyRender: false,

    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  if (!editor) return null

  return (
    <div className="w-full">

      <div
        className="
          sticky
          top-20
          z-30

          mb-10

          flex
          items-center
          gap-1

          w-fit

          rounded-2xl
          border
          border-neutral-800

          bg-neutral-950/90
          backdrop-blur-2xl

          p-2
        "
      >
        <Button
          active={editor.isActive("heading", { level: 1 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
        >
          H1
        </Button>

        <Button
          active={editor.isActive("heading", { level: 2 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          H2
        </Button>

        <Button
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          H3
        </Button>

        <div className="w-px h-5 bg-neutral-800 mx-1" />

        <Button
          active={editor.isActive("bulletList")}
          onClick={() =>
            editor.chain().focus().toggleBulletList().run()
          }
        >
          •
        </Button>

        <Button
          active={editor.isActive("orderedList")}
          onClick={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
        >
          1.
        </Button>

        <Button
          active={editor.isActive("blockquote")}
          onClick={() =>
            editor.chain().focus().toggleBlockquote().run()
          }
        >
          ❝
        </Button>

        <div className="w-px h-5 bg-neutral-800 mx-1" />

        <Button
          active={editor.isActive("bold")}
          onClick={() =>
            editor.chain().focus().toggleBold().run()
          }
        >
          B
        </Button>

        <Button
          active={editor.isActive("italic")}
          onClick={() =>
            editor.chain().focus().toggleItalic().run()
          }
        >
          I
        </Button>

        <Button
          active={editor.isActive("underline")}
          onClick={() =>
            editor.chain().focus().toggleUnderline().run()
          }
        >
          U
        </Button>

        <div className="w-px h-5 bg-neutral-800 mx-1" />

        <Button
        onClick={() => {

            const text = editor.state.doc.textBetween(
            editor.state.selection.from,
            editor.state.selection.to
            )

            if (!text.trim()) return

            setSelectedText(text)
            setShowPearlModal(true)
        }}
        >
        💎
        </Button>
    </div>

      <EditorContent
        editor={editor}
        className="
          max-w-none

          [&_.ProseMirror]:outline-none
          [&_.ProseMirror]:min-h-[900px]

          [&_.ProseMirror]:text-[18px]
          [&_.ProseMirror]:leading-8

          [&_.ProseMirror_h1]:text-5xl
          [&_.ProseMirror_h1]:font-bold
          [&_.ProseMirror_h1]:tracking-tight
          [&_.ProseMirror_h1]:leading-tight
          [&_.ProseMirror_h1]:mb-6

          [&_.ProseMirror_h2]:text-3xl
          [&_.ProseMirror_h2]:font-bold
          [&_.ProseMirror_h2]:mt-12
          [&_.ProseMirror_h2]:mb-4

          [&_.ProseMirror_h3]:text-2xl
          [&_.ProseMirror_h3]:font-semibold
          [&_.ProseMirror_h3]:mt-8
          [&_.ProseMirror_h3]:mb-3

          [&_.ProseMirror_p]:text-neutral-200

          [&_.ProseMirror_ul]:list-disc
          [&_.ProseMirror_ul]:pl-6

          [&_.ProseMirror_ol]:list-decimal
          [&_.ProseMirror_ol]:pl-6

          [&_.ProseMirror_li]:my-2

          [&_.ProseMirror_blockquote]:border-l-4
          [&_.ProseMirror_blockquote]:border-neutral-700
          [&_.ProseMirror_blockquote]:pl-4
          [&_.ProseMirror_blockquote]:italic
          [&_.ProseMirror_blockquote]:text-neutral-400
        "
      />
    </div>
  )
}