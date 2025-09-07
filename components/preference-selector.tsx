"use client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { type PreferenceLevel, preferenceColors, preferenceLabels } from "@/lib/kinklist-data"

interface PreferenceSelectorProps {
  currentLevel: PreferenceLevel
  onLevelChange: (level: PreferenceLevel) => void
  className?: string
  isDual?: boolean
  dualLabels?: { first: string; second: string }
  currentDualLevel?: PreferenceLevel
  onDualLevelChange?: (level: PreferenceLevel) => void
}

const preferenceOptions: PreferenceLevel[] = ["favorite", "like", "indifferent", "maybe", "limit"]

export function PreferenceSelector({
  currentLevel,
  onLevelChange,
  className,
  isDual = false,
  dualLabels,
  currentDualLevel,
  onDualLevelChange,
}: PreferenceSelectorProps) {
  if (isDual && dualLabels) {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-right">{dualLabels.first}</span>
          <div className="flex gap-1" role="radiogroup" aria-label={`${dualLabels.first} preference level`}>
            {preferenceOptions.map((level) => (
              <Button
                key={level}
                variant="ghost"
                size="sm"
                className={cn(
                  "preference-button w-6 h-6 p-0 rounded-full border-2 border-border/50 transition-all duration-300",
                  preferenceColors[level],
                  currentLevel === level && "ring-2 ring-primary/50 ring-offset-1 scale-110 shadow-lg",
                  "hover:scale-110 hover:shadow-md hover:border-primary/30 focus:scale-110 focus:shadow-md",
                  "active:scale-95",
                  "relative overflow-hidden",
                  currentLevel === level && "animate-bounce-subtle",
                )}
                onClick={() => onLevelChange(level)}
                aria-label={`Set ${dualLabels.first} preference to ${preferenceLabels[level]}`}
                role="radio"
                aria-checked={currentLevel === level}
                tabIndex={currentLevel === level ? 0 : -1}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
                <span className="sr-only">{preferenceLabels[level]}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground min-w-[60px] text-right">{dualLabels.second}</span>
          <div className="flex gap-1" role="radiogroup" aria-label={`${dualLabels.second} preference level`}>
            {preferenceOptions.map((level) => (
              <Button
                key={level}
                variant="ghost"
                size="sm"
                className={cn(
                  "preference-button w-6 h-6 p-0 rounded-full border-2 border-border/50 transition-all duration-300",
                  preferenceColors[level],
                  currentDualLevel === level && "ring-2 ring-primary/50 ring-offset-1 scale-110 shadow-lg",
                  "hover:scale-110 hover:shadow-md hover:border-primary/30 focus:scale-110 focus:shadow-md",
                  "active:scale-95",
                  "relative overflow-hidden",
                  currentDualLevel === level && "animate-bounce-subtle",
                )}
                onClick={() => onDualLevelChange?.(level)}
                aria-label={`Set ${dualLabels.second} preference to ${preferenceLabels[level]}`}
                role="radio"
                aria-checked={currentDualLevel === level}
                tabIndex={currentDualLevel === level ? 0 : -1}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
                <span className="sr-only">{preferenceLabels[level]}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex gap-1", className)} role="radiogroup" aria-label="Preference level">
      {preferenceOptions.map((level) => (
        <Button
          key={level}
          variant="ghost"
          size="sm"
          className={cn(
            "preference-button w-7 h-7 p-0 rounded-full border-2 border-border/50 transition-all duration-300",
            preferenceColors[level],
            currentLevel === level && "ring-2 ring-primary/50 ring-offset-2 scale-110 shadow-lg",
            "hover:scale-110 hover:shadow-md hover:border-primary/30 focus:scale-110 focus:shadow-md",
            "active:scale-95",
            "relative overflow-hidden",
            currentLevel === level && "animate-bounce-subtle",
          )}
          onClick={() => onLevelChange(level)}
          aria-label={`Set preference to ${preferenceLabels[level]}`}
          role="radio"
          aria-checked={currentLevel === level}
          tabIndex={currentLevel === level ? 0 : -1}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200" />
          <span className="sr-only">{preferenceLabels[level]}</span>
        </Button>
      ))}
    </div>
  )
}
