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
  <div className="fixed inset-x-0 bottom-0 z-50 hide-when-modal">

    {/* MOBILE = FULL WIDTH */}
    <div className="block sm:hidden">

      <nav className="bg-neutral-900/90 backdrop-blur border-t border-neutral-800 flex justify-around items-center py-2 pb-[calc(8px+env(safe-area-inset-bottom))]">

        {items.map(({ href, icon: Icon }) => {
          const active = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center flex-1"
            >
              <div
                className={`p-2 rounded-xl transition-all duration-200 ${
                  active
                    ? "text-white"
                    : "text-neutral-500"
                }`}
              >
                <Icon size={22} />
              </div>

              {/* petit indicateur */}
              <div
                className={`mt-1 h-1 w-5 rounded-full transition-all ${
                  active ? "bg-white" : "bg-transparent"
                }`}
              />
            </Link>
          )
        })}

      </nav>
    </div>

    {/* DESKTOP = FLOATING CENTER */}
    <div className="hidden sm:flex justify-center px-4 pb-6">

      <nav className="bg-neutral-900/80 backdrop-blur border border-neutral-800 rounded-2xl shadow-xl flex gap-10 px-6 py-3">

        {items.map(({ href, icon: Icon }) => {
          const active = pathname === href

          return (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-center"
            >
              <div
                className={`p-2 rounded-xl transition-colors duration-200 ${
                  active
                    ? "text-white bg-neutral-800"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                <Icon size={22} />
              </div>
            </Link>
          )
        })}

      </nav>
    </div>

  </div>
)

}