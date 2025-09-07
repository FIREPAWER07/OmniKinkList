"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"
import { KinkItemCard } from "./kink-item-card"
import type { KinkCategory, UserPreference } from "@/lib/kinklist-data"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { categoryExplanations } from "@/lib/kinklist-data" // Import categoryExplanations

interface CategorySectionProps {
  category: KinkCategory
  preferences: Record<string, UserPreference>
  onPreferenceChange: (preference: UserPreference) => void
  searchTerm: string
  className?: string
}

export function CategorySection({
  category,
  preferences,
  onPreferenceChange,
  searchTerm,
  className,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Filter items based on search term
  const filteredItems = category.items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  if (filteredItems.length === 0 && searchTerm) {
    return null
  }

  const itemsToShow = searchTerm ? filteredItems : category.items
  const categoryExplanation = categoryExplanations[category.name]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={cn("card-hover animate-fade-in", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl font-bold text-balance gradient-text">
                {category.name}
                {category.subcategory && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">({category.subcategory})</span>
                )}
              </CardTitle>
              {categoryExplanation && (
                <p className="text-sm text-muted-foreground mt-1 text-pretty">{categoryExplanation}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={`${isExpanded ? "Collapse" : "Expand"} ${category.name} category`}
              className="ml-2 hover:bg-primary/10 transition-colors duration-200 flex-shrink-0"
            >
              <motion.div animate={{ rotate: isExpanded ? 0 : -90 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </Button>
          </div>
        </CardHeader>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {itemsToShow.map((item, index) => (
                    <motion.div
                      key={`${category.name}-${item.name}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <KinkItemCard
                        item={item}
                        preference={preferences[item.name]}
                        onPreferenceChange={onPreferenceChange}
                      />
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
