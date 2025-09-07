"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, Sparkles, List, Zap, Upload } from "lucide-react"
import { useTheme } from "next-themes"
import { motion } from "framer-motion"
import { Badge } from "@/components/ui/badge"

interface ListSelectionProps {
  onSelectList: (listType: string) => void
  language: string
  onLanguageChange: (language: string) => void
  onImportPreferences?: (preferences: any) => void
}

const translations = {
  en: {
    title: "Choose Your Kink List",
    subtitle: "Select the list that best fits your exploration needs",
    classic: "Classic List",
    classicDesc: "The original, straightforward list with essential categories",
    detailed: "Detailed List",
    detailedDesc: "Enhanced version with more descriptions and subcategories",
    extended: "Extended List",
    extendedDesc: "Comprehensive list with all categories and detailed explanations",
    getStarted: "Get Started",
    import: "Import Preferences",
  },
  es: {
    title: "Elige Tu Lista de Fetiches",
    subtitle: "Selecciona la lista que mejor se adapte a tus necesidades de exploración",
    classic: "Lista Clásica",
    classicDesc: "La lista originale y directa con categorías esenciales",
    detailed: "Lista Detallada",
    detailedDesc: "Versión mejorada con más descripciones y subcategorías",
    extended: "Lista Extendida",
    extendedDesc: "Lista completa con todas las categorías y explicaciones detalladas",
    getStarted: "Comenzar",
    import: "Importar Preferencias",
  },
  fr: {
    title: "Choisissez Votre Liste de Fétiches",
    subtitle: "Sélectionnez la liste qui correspond le mieux à vos besoins d'exploration",
    classic: "Liste Classique",
    classicDesc: "La liste originale et directe avec les catégories essentielles",
    detailed: "Liste Détaillée",
    detailedDesc: "Version améliorée avec plus de descriptions et de sous-catégories",
    extended: "Liste Étendue",
    extendedDesc: "Liste complète avec toutes les catégories et explications détaillées",
    getStarted: "Commencer",
    import: "Importer Préférences",
  },
  de: {
    title: "Wähle Deine Fetisch-Liste",
    subtitle: "Wähle die Liste, die am besten zu deinen Erkundungsbedürfnissen passt",
    classic: "Klassische Liste",
    classicDesc: "Die ursprüngliche, unkomplizierte Liste mit wesentlichen Kategorien",
    detailed: "Detaillierte Liste",
    detailedDesc: "Erweiterte Version mit mehr Beschreibungen und Unterkategorien",
    extended: "Erweiterte Liste",
    extendedDesc: "Umfassende Liste mit allen Kategorien und detaillierten Erklärungen",
    getStarted: "Loslegen",
    import: "Einstellungen Importieren",
  },
}

const languageFlags = {
  en: "🇺🇸",
  es: "🇪🇸",
  fr: "🇫🇷",
  de: "🇩🇪",
}

export function ListSelection({ onSelectList, language, onLanguageChange, onImportPreferences }: ListSelectionProps) {
  const { theme, setTheme } = useTheme()
  const [selectedList, setSelectedList] = useState<string | null>(null)
  const t = translations[language as keyof typeof translations]

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
            if (data.preferences && data.listType) {
              onImportPreferences?.(data.preferences)
              onSelectList(data.listType)
            }
          } catch (error) {
            console.error("Failed to import data:", error)
            alert("Failed to import file. Please check the file format.")
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const lists = [
    {
      id: "classic",
      title: t.classic,
      description: t.classicDesc,
      icon: List,
      gradient: "from-blue-500/20 to-purple-500/20",
      itemCount: "~200 items",
    },
    {
      id: "detailed",
      title: t.detailed,
      description: t.detailedDesc,
      icon: Sparkles,
      gradient: "from-purple-500/20 to-pink-500/20",
      itemCount: "~300 items",
    },
    {
      id: "extended",
      title: t.extended,
      description: t.extendedDesc,
      icon: Zap,
      gradient: "from-pink-500/20 to-red-500/20",
      itemCount: "~400+ items",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <motion.h1
              className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              KinkList
            </motion.h1>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleImport} className="gap-2 bg-transparent">
                <Upload className="h-4 w-4" />
                {t.import}
              </Button>

              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{languageFlags.en} EN</SelectItem>
                  <SelectItem value="es">{languageFlags.es} ES</SelectItem>
                  <SelectItem value="fr">{languageFlags.fr} FR</SelectItem>
                  <SelectItem value="de">{languageFlags.de} DE</SelectItem>
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
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <motion.div
          className="text-center space-y-4 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl font-bold text-balance text-foreground">{t.title}</h2>
          <p className="text-muted-foreground text-lg text-pretty max-w-2xl mx-auto">{t.subtitle}</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {lists.map((list, index) => {
            const Icon = list.icon
            return (
              <motion.div
                key={list.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    selectedList === list.id ? "ring-2 ring-primary shadow-lg" : ""
                  }`}
                  onClick={() => setSelectedList(list.id)}
                >
                  <CardHeader className="text-center">
                    <div
                      className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${list.gradient} flex items-center justify-center mb-4`}
                    >
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{list.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-pretty mb-2">{list.description}</CardDescription>
                    <div className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {list.itemCount}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>

        {selectedList && (
          <motion.div
            className="text-center mt-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Button
              size="lg"
              onClick={() => onSelectList(selectedList)}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-300"
            >
              {t.getStarted}
            </Button>
          </motion.div>
        )}
      </main>
    </div>
  )
}
