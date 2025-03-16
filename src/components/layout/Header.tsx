"use client"

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#F7F3F0] border-b border-[#E5E0DC]">
      <div className="px-6 py-4 max-w-screen-sm mx-auto flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-wide">{title}</h1>
      </div>
    </header>
  )
}