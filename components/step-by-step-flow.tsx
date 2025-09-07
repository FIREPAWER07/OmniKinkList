"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Moon, Sun, ArrowLeft, ArrowRight, RotateCcw, Download } from "lucide-react"
import { useTheme } from "next-themes"
import { motion, AnimatePresence } from "framer-motion"
import { CategorySection } from "@/components/category-section"
import { PreferenceLegend } from "@/components/preference-legend"
import { parseKinkListData, getKinkListData, type UserPreference } from "@/lib/kinklist-data"

interface StepByStepFlowProps {
  listType: string
  preferences: Record<string, UserPreference>
  onPreferenceChange: (preference: UserPreference) => void
  onReset: () => void
  language: string
  onLanguageChange: (language: string) => void
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

const translations = {
  en: {
    step: "Step",
    of: "of",
    continue: "Continue",
    previous: "Previous",
    finish: "Finish",
    reset: "Reset",
    completed: "Completed!",
    completedDesc: "You've finished setting your preferences. You can export your list or start over.",
  },
  es: {
    step: "Paso",
    of: "de",
    continue: "Continuar",
    previous: "Anterior",
    finish: "Finalizar",
    reset: "Reiniciar",
    completed: "¡Completado!",
    completedDesc: "Has terminado de establecer tus preferencias. Puedes exportar tu lista o empezar de nuevo.",
  },
  fr: {
    step: "Étape",
    of: "sur",
    continue: "Continuer",
    previous: "Précédent",
    finish: "Terminer",
    reset: "Réinitialiser",
    completed: "Terminé!",
    completedDesc: "Vous avez fini de définir vos préférences. Vous pouvez exporter votre liste ou recommencer.",
  },
  de: {
    step: "Schritt",
    of: "von",
    continue: "Weiter",
    previous: "Zurück",
    finish: "Beenden",
    reset: "Zurücksetzen",
    completed: "Abgeschlossen!",
    completedDesc: "Sie haben Ihre Präferenzen festgelegt. Sie können Ihre Liste exportieren oder von vorne beginnen.",
  },
  it: {
    step: "Passo",
    of: "di",
    continue: "Continua",
    previous: "Precedente",
    finish: "Finisci",
    reset: "Ripristina",
    completed: "Completato!",
    completedDesc: "Hai finito di impostare le tue preferenze. Puoi esportare la tua lista o ricominciare.",
  },
  pt: {
    step: "Passo",
    of: "de",
    continue: "Continuar",
    previous: "Anterior",
    finish: "Finalizar",
    reset: "Reiniciar",
    completed: "Concluído!",
    completedDesc: "Você terminou de definir suas preferências. Pode exportar sua lista ou começar novamente.",
  },
  ru: {
    step: "Шаг",
    of: "из",
    continue: "Продолжить",
    previous: "Назад",
    finish: "Завершить",
    reset: "Сбросить",
    completed: "Завершено!",
    completedDesc: "Вы закончили настройку предпочтений. Можете экспортировать список или начать заново.",
  },
  ja: {
    step: "ステップ",
    of: "の",
    continue: "続行",
    previous: "前へ",
    finish: "完了",
    reset: "リセット",
    completed: "完了！",
    completedDesc: "設定が完了しました。リストをエクスポートするか、最初からやり直すことができます。",
  },
  ko: {
    step: "단계",
    of: "중",
    continue: "계속",
    previous: "이전",
    finish: "완료",
    reset: "재설정",
    completed: "완료!",
    completedDesc: "설정을 완료했습니다. 목록을 내보내거나 다시 시작할 수 있습니다.",
  },
  zh: {
    step: "步骤",
    of: "共",
    continue: "继续",
    previous: "上一步",
    finish: "完成",
    reset: "重置",
    completed: "完成！",
    completedDesc: "您已完成偏好设置。您可以导出列表或重新开始。",
  },
}

export function StepByStepFlow({
  listType,
  preferences,
  onPreferenceChange,
  onReset,
  language,
  onLanguageChange,
}: StepByStepFlowProps) {
  const { theme, setTheme } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)
  const t = translations[language as keyof typeof translations] || translations.en

  // Parse kink list data
  const categories = useMemo(() => {
    return parseKinkListData(getKinkListData(listType))
  }, [listType])

  const totalSteps = categories.length
  const isLastStep = currentStep === totalSteps - 1
  const isCompleted = currentStep >= totalSteps

  const currentLanguage = languageOptions.find((lang) => lang.value === language)

  const handleExport = () => {
    console.log("[v0] Export JSON button clicked")
    const data = {
      preferences,
      listType,
      exportDate: new Date().toISOString(),
    }
    console.log("[v0] Creating JSON data:", data)

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    console.log("[v0] JSON blob created:", blob)

    const url = URL.createObjectURL(blob)
    console.log("[v0] Object URL created:", url)

    const a = document.createElement("a")
    a.href = url
    a.download = `kinklist-${new Date().toISOString().split("T")[0]}.json`
    a.style.display = "none" // Hide the link element

    console.log("[v0] Download link created with filename:", a.download)

    document.body.appendChild(a)
    console.log("[v0] Link appended to body")

    setTimeout(() => {
      a.click()
      console.log("[v0] Link clicked")

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log("[v0] Cleanup completed")
      }, 100)
    }, 10)

    console.log("[v0] JSON export completed successfully")
  }

  const handleExportHTML = () => {
    console.log("[v0] Export HTML button clicked")
    const selectedPreferences = Object.values(preferences).filter((pref) => pref.level !== "not-entered")
    console.log("[v0] Selected preferences for HTML:", selectedPreferences)

    console.log("[v0] Creating HTML blob")
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Kinklist - ${new Date().toLocaleDateString()}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            background: #f8fafc;
            color: #334155;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .category {
            margin-bottom: 30px;
            background: white;
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .category h2 {
            margin: 0 0 15px 0;
            color: #1e293b;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 8px;
        }
        .preference-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #f1f5f9;
        }
        .preference-item:last-child {
            border-bottom: none;
        }
        .preference-level {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .favorite { background: #dcfce7; color: #166534; }
        .like { background: #dbeafe; color: #1d4ed8; }
        .indifferent { background: #f3f4f6; color: #374151; }
        .maybe { background: #fef3c7; color: #92400e; }
        .limit { background: #fee2e2; color: #dc2626; }
        .dual-preference {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .dual-label {
            font-size: 11px;
            color: #64748b;
        }
        .notes {
            font-style: italic;
            color: #64748b;
            margin-top: 4px;
            font-size: 14px;
        }
        .legend {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .legend-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .legend-color {
            width: 12px;
            height: 12px;
            border-radius: 50%;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>My Kinklist</h1>
        <p>Generated on ${new Date().toLocaleDateString()} • List Type: ${listType}</p>
        <div class="legend">
            <div class="legend-item"><div class="legend-color favorite"></div><span>Favorite</span></div>
            <div class="legend-item"><div class="legend-color like"></div><span>Like</span></div>
            <div class="legend-item"><div class="legend-color indifferent"></div><span>Indifferent</span></div>
            <div class="legend-item"><div class="legend-color maybe"></div><span>Maybe</span></div>
            <div class="legend-item"><div class="legend-color limit"></div><span>Limit</span></div>
        </div>
    </div>

    ${categories
      .map((category) => {
        const categoryPrefs = selectedPreferences.filter((pref) =>
          category.items.some((item) => item.name === pref.itemName),
        )

        if (categoryPrefs.length === 0) return ""

        return `
        <div class="category">
            <h2>${category.name}</h2>
            ${categoryPrefs
              .map((pref) => {
                const item = category.items.find((item) => item.name === pref.itemName)
                return `
                <div class="preference-item">
                    <div>
                        <strong>${pref.itemName}</strong>
                        ${pref.notes ? `<div class="notes">"${pref.notes}"</div>` : ""}
                    </div>
                    <div class="dual-preference">
                        ${
                          item?.hasDualPreference && pref.dualLevel
                            ? `
                            <div>
                                <div class="dual-label">${item.dualLabels?.first}</div>
                                <span class="preference-level ${pref.level}">${pref.level}</span>
                            </div>
                            <div>
                                <div class="dual-label">${item.dualLabels?.second}</div>
                                <span class="preference-level ${pref.dualLevel}">${pref.dualLevel}</span>
                            </div>
                        `
                            : `
                            <span class="preference-level ${pref.level}">${pref.level}</span>
                        `
                        }
                    </div>
                </div>
              `
              })
              .join("")}
        </div>
      `
      })
      .filter(Boolean)
      .join("")}

</body>
</html>`

    const blob = new Blob([html], { type: "text/html" })
    console.log("[v0] HTML blob created:", blob)

    const url = URL.createObjectURL(blob)
    console.log("[v0] HTML Object URL created:", url)

    const a = document.createElement("a")
    a.href = url
    a.download = `kinklist-${new Date().toISOString().split("T")[0]}.html`
    a.style.display = "none" // Hide the link element

    console.log("[v0] HTML download link created with filename:", a.download)

    document.body.appendChild(a)
    console.log("[v0] HTML link appended to body")

    setTimeout(() => {
      a.click()
      console.log("[v0] HTML link clicked")

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        console.log("[v0] HTML cleanup completed")
      }, 100)
    }, 10)

    console.log("[v0] HTML export completed successfully")
  }

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
            if (data.preferences) {
              Object.values(data.preferences).forEach((pref: any) => {
                onPreferenceChange(pref)
              })
            }
          } catch (error) {
            console.error("Failed to import data:", error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                KinkList
              </h1>
              <div className="flex items-center gap-2">
                <Select value={language} onValueChange={onLanguageChange}>
                  <SelectTrigger className="w-24">
                    <SelectValue>{currentLanguage?.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                  <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                  <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-md mx-auto space-y-6"
          >
            <div className="text-6xl">🎉</div>
            <h2 className="text-3xl font-bold">{t.completed}</h2>
            <p className="text-muted-foreground">{t.completedDesc}</p>

            <div className="flex gap-4 justify-center">
              <Button onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export JSON
              </Button>
              <Button onClick={handleExportHTML} variant="outline" className="gap-2 bg-transparent">
                <Download className="h-4 w-4" />
                Export HTML
              </Button>
              <Button onClick={onReset} variant="outline" className="gap-2 bg-transparent">
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </motion.div>
        </main>
      </div>
    )
  }

  const currentCategory = categories[currentStep]
  const progress = ((currentStep + 1) / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                KinkList
              </h1>
              <div className="text-sm text-muted-foreground">
                {t.step} {currentStep + 1} {t.of} {totalSteps}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger className="w-24">
                  <SelectValue>{currentLanguage?.label}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="ghost" size="sm" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              </Button>

              <Button onClick={onReset} variant="ghost" size="sm" className="gap-2">
                <RotateCcw className="h-4 w-4" />
                {t.reset}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <Progress value={progress} className="h-2" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <PreferenceLegend />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="mt-6"
          >
            {currentCategory && (
              <CategorySection
                category={currentCategory}
                preferences={preferences}
                onPreferenceChange={onPreferenceChange}
                searchTerm=""
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between items-center mt-8 pt-6 border-t">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.previous}
          </Button>

          <div className="text-sm text-muted-foreground">{currentCategory?.name}</div>

          <Button
            onClick={() => {
              if (isLastStep) {
                setCurrentStep(totalSteps)
              } else {
                setCurrentStep(currentStep + 1)
              }
            }}
            className="gap-2"
          >
            {isLastStep ? t.finish : t.continue}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </main>
    </div>
  )
}
