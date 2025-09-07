"use client"

import { useState, useEffect } from "react"
import { ListSelection } from "@/components/list-selection"
import { StepByStepFlow } from "@/components/step-by-step-flow"
import type { UserPreference } from "@/lib/kinklist-data"

export default function HomePage() {
  const [selectedListType, setSelectedListType] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<Record<string, UserPreference>>({})
  const [language, setLanguage] = useState("en")

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("kinklist-preferences")
    if (saved) {
      try {
        setPreferences(JSON.parse(saved))
      } catch (error) {
        console.error("Failed to load preferences:", error)
      }
    }
  }, [])

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem("kinklist-preferences", JSON.stringify(preferences))
  }, [preferences])

  const handlePreferenceChange = (preference: UserPreference) => {
    setPreferences((prev) => ({
      ...prev,
      [preference.itemName]: preference,
    }))
  }

  const handleImportPreferences = (importedPreferences: Record<string, UserPreference>) => {
    setPreferences(importedPreferences)
  }

  const handleReset = () => {
    setSelectedListType(null)
    setPreferences({})
    localStorage.removeItem("kinklist-preferences")
  }

  if (!selectedListType) {
    return (
      <ListSelection
        onSelectList={setSelectedListType}
        language={language}
        onLanguageChange={setLanguage}
        onImportPreferences={handleImportPreferences}
      />
    )
  }

  return (
    <StepByStepFlow
      listType={selectedListType}
      preferences={preferences}
      onPreferenceChange={handlePreferenceChange}
      onReset={handleReset}
      language={language}
      onLanguageChange={setLanguage}
    />
  )
}
