"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Filter, X } from "lucide-react"
import { type PreferenceLevel, preferenceLabels } from "@/lib/kinklist-data"

interface SearchAndFiltersProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  selectedFilters: PreferenceLevel[]
  onFilterChange: (filters: PreferenceLevel[]) => void
  categories: string[]
  selectedCategories: string[]
  onCategoryChange: (categories: string[]) => void
}

export function SearchAndFilters({
  searchTerm,
  onSearchChange,
  selectedFilters,
  onFilterChange,
  categories,
  selectedCategories,
  onCategoryChange,
}: SearchAndFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const toggleFilter = (filter: PreferenceLevel) => {
    if (selectedFilters.includes(filter)) {
      onFilterChange(selectedFilters.filter((f) => f !== filter))
    } else {
      onFilterChange([...selectedFilters, filter])
    }
  }

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoryChange(selectedCategories.filter((c) => c !== category))
    } else {
      onCategoryChange([...selectedCategories, category])
    }
  }

  const clearAllFilters = () => {
    onFilterChange([])
    onCategoryChange([])
    onSearchChange("")
  }

  const hasActiveFilters = selectedFilters.length > 0 || selectedCategories.length > 0 || searchTerm

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search preferences..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            aria-label="Search preferences"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
          aria-label="Toggle filters"
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs">
              {selectedFilters.length + selectedCategories.length + (searchTerm ? 1 : 0)}
            </Badge>
          )}
        </Button>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={clearAllFilters}
            className="flex items-center gap-2"
            aria-label="Clear all filters"
          >
            <X className="w-4 h-4" />
            Clear
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-2">Filter by Preference Level</h3>
              <div className="flex flex-wrap gap-2">
                {(["favorite", "like", "indifferent", "maybe", "limit"] as PreferenceLevel[]).map((filter) => (
                  <Button
                    key={filter}
                    variant={selectedFilters.includes(filter) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFilter(filter)}
                    className="text-xs"
                  >
                    {preferenceLabels[filter]}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">Filter by Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategories.includes(category) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleCategory(category)}
                    className="text-xs"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
