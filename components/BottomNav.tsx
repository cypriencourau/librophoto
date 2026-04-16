"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Library, BookOpen } from "lucide-react"

export default function BottomNav() {

  const pathname = usePathname()

  const items = [
    { href: "/", icon: Home },
    { href: "/library", icon: Library },
    { href: "/books", icon: BookOpen },
  ]

  return (

    <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 hide-when-modal transition-all duration-300">

      <nav className="bg-neutral-900 border border-neutral-800 rounded-2xl px-6 py-3 flex gap-10 shadow-xl backdrop-blur">

        {items.map(({ href, icon: Icon }) => {

          const active = pathname === href

          return (

            <Link
              key={href}
              href={href}
              className={`p-2 rounded-lg transition ${
                active
                  ? "text-white"
                  : "text-neutral-500 hover:text-white"
              }`}
            >

              <Icon size={22} />

            </Link>

          )

        })}

      </nav>

    </div>

  )

}