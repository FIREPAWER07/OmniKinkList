"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Info, MessageSquare } from "lucide-react"
import { PreferenceSelector } from "./preference-selector"
import type { KinkItem, PreferenceLevel, UserPreference } from "@/lib/kinklist-data"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

interface KinkItemCardProps {
  item: KinkItem
  preference: UserPreference | undefined
  onPreferenceChange: (preference: UserPreference) => void
  className?: string
}

export function KinkItemCard({ item, preference, onPreferenceChange, className }: KinkItemCardProps) {
  const [showNotes, setShowNotes] = useState(false)
  const [showDescription, setShowDescription] = useState(false)

  const handleLevelChange = (level: PreferenceLevel) => {
    onPreferenceChange({
      itemName: item.name,
      level,
      notes: preference?.notes || "",
      dualLevel: preference?.dualLevel,
    })
  }

  const handleDualLevelChange = (level: PreferenceLevel) => {
    onPreferenceChange({
      itemName: item.name,
      level: preference?.level || "not-entered",
      notes: preference?.notes || "",
      dualLevel: level,
    })
  }

  const handleNotesChange = (notes: string) => {
    onPreferenceChange({
      itemName: item.name,
      level: preference?.level || "not-entered",
      notes,
      dualLevel: preference?.dualLevel,
    })
  }

  return (
    <Card className={cn("group card-hover animate-slide-up", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-medium text-sm leading-tight text-balance">{item.name}</h3>
              {item.description && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-4 h-4 p-0 opacity-60 hover:opacity-100 transition-all duration-200 hover:scale-110"
                  onClick={() => setShowDescription(!showDescription)}
                  aria-label={`${showDescription ? "Hide" : "Show"} description for ${item.name}`}
                >
                  <motion.div animate={{ rotate: showDescription ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <Info className="w-3 h-3" />
                  </motion.div>
                </Button>
              )}
            </div>

            {item.subcategory && (
              <Badge variant="secondary" className="text-xs mb-2 animate-fade-in">
                {item.subcategory}
              </Badge>
            )}

            <AnimatePresence>
              {showDescription && item.description && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-xs text-muted-foreground mb-3 leading-relaxed"
                >
                  {item.description}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col items-end gap-2">
            <PreferenceSelector
              currentLevel={preference?.level || "not-entered"}
              onLevelChange={handleLevelChange}
              isDual={item.hasDualPreference}
              dualLabels={item.dualLabels}
              currentDualLevel={preference?.dualLevel || "not-entered"}
              onDualLevelChange={handleDualLevelChange}
            />

            {preference?.level && preference.level !== "not-entered" && (
              <Button
                variant="ghost"
                size="sm"
                className="w-4 h-4 p-0 opacity-60 hover:opacity-100 transition-all duration-200 hover:scale-110"
                onClick={() => setShowNotes(!showNotes)}
                aria-label={`${showNotes ? "Hide" : "Show"} notes for ${item.name}`}
              >
                <motion.div animate={{ scale: showNotes ? 1.1 : 1 }} transition={{ duration: 0.2 }}>
                  <MessageSquare className="w-3 h-3" />
                </motion.div>
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showNotes && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 pt-3 border-t"
            >
              <Textarea
                placeholder="Add personal notes..."
                value={preference?.notes || ""}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[60px] text-xs transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                aria-label={`Notes for ${item.name}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
