import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { preferenceColors, preferenceLabels, type PreferenceLevel } from "@/lib/kinklist-data"
import { cn } from "@/lib/utils"

const preferenceOptions: PreferenceLevel[] = ["favorite", "like", "indifferent", "maybe", "limit", "not-entered"]

export function PreferenceLegend() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Preference Legend</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {preferenceOptions.map((level) => (
            <div key={level} className="flex items-center gap-2">
              <div
                className={cn("w-4 h-4 rounded-full border border-border", preferenceColors[level])}
                aria-hidden="true"
              />
              <span className="text-xs text-muted-foreground">{preferenceLabels[level]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
