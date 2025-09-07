"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Download, Upload } from "lucide-react"
import { useTheme } from "next-themes"

interface HeaderProps {
  listType: string
  onListTypeChange: (type: string) => void
  onExport: () => void
  onImport: (data: any) => void
}

const languageOptions = [
  { value: "en", label: "🇺🇸 EN", name: "English" },
  { value: "es", label: "🇪🇸 ES", name: "Español" },
  { value: "fr", label: "🇫🇷 FR", name: "Français" },
  { value: "de", label: "🇩🇪 DE", name: "Deutsch" },
  { value: "it", label: "🇮🇹 IT", name: "Italiano" },
  { value: "pt", label: "🇵🇹 PT", name: "Português" },
  { value: "ru", label: "🇷🇺 RU", name: "Русский" },
  { value: "ja", label: "🇯🇵 JA", name: "日本語" },
  { value: "ko", label: "🇰🇷 KO", name: "한국어" },
  { value: "zh", label: "🇨🇳 ZH", name: "中文" },
]

export function Header({ listType, onListTypeChange, onExport, onImport }: HeaderProps) {
  const { theme, setTheme } = useTheme()
  const [language, setLanguage] = useState("en")

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string)
            onImport(data)
          } catch (error) {
            console.error("Failed to import data:", error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const currentLanguage = languageOptions.find((lang) => lang.value === language)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground text-balance">KinkList</h1>
            <Select value={listType} onValueChange={onListTypeChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="extended">Extended</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-24">
                <SelectValue>{currentLanguage?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value} className="flex items-center gap-2">
                    <span className="flex items-center gap-2">{lang.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            <Button variant="ghost" size="sm" onClick={handleImport} aria-label="Import preferences">
              <Upload className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="sm" onClick={onExport} aria-label="Export preferences">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
