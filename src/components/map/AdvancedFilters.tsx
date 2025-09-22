import React, { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { RotateCcw, Filter } from 'lucide-react'
import { MapFilters } from '@/lib/mapStyle'

interface FilterVocabulary {
  id: string
  label: string
  is_active?: boolean
}

interface AdvancedFiltersProps {
  vocabularies?: {
    definizioni: FilterVocabulary[]
    cronologie: FilterVocabulary[]
    indicatori: FilterVocabulary[]
    ambiti: FilterVocabulary[]
  }
  initialFilters?: MapFilters
  onFiltersChange: (filters: MapFilters) => void
  className?: string
}

export const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({
  vocabularies,
  initialFilters = {},
  onFiltersChange,
  className = ''
}) => {
  const [filters, setFilters] = useState<MapFilters>(initialFilters)
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize filters from props
  useEffect(() => {
    setFilters(initialFilters)
  }, [initialFilters])

  // Check if there are unsaved changes
  useEffect(() => {
    const hasUnsavedChanges = 
      JSON.stringify(filters) !== JSON.stringify(initialFilters)
    setHasChanges(hasUnsavedChanges)
  }, [filters, initialFilters])

  const handleFilterChange = (
    category: keyof MapFilters, 
    value: string, 
    checked: boolean
  ) => {
    const newFilters = {
      ...filters,
      [category]: checked
        ? [...(filters[category] || []), value]
        : (filters[category] || []).filter(v => v !== value)
    }
    
    // Clean up empty arrays
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key as keyof MapFilters]?.length === 0) {
        delete newFilters[key as keyof MapFilters]
      }
    })
    
    setFilters(newFilters)
    // Apply filters immediately for better UX
    onFiltersChange(newFilters)
  }

  const applyFilters = () => {
    onFiltersChange(filters)
    setHasChanges(false)
  }

  const resetFilters = () => {
    const emptyFilters: MapFilters = {}
    setFilters(emptyFilters)
    onFiltersChange(emptyFilters)
  }

  const getActiveCount = () => {
    return Object.values(filters).reduce((count, values) => 
      count + (values?.length || 0), 0
    )
  }

  const activeCount = getActiveCount()

  if (!vocabularies) {
    return (
      <div className="text-center text-muted-foreground text-sm py-4">
        Caricamento vocabolari...
      </div>
    )
  }

  const filterSections = [
    {
      key: 'definizioni' as keyof MapFilters,
      label: 'Definizioni',
      items: vocabularies.definizioni?.filter(item => item.is_active !== false) || []
    },
    {
      key: 'cronologie' as keyof MapFilters,
      label: 'Cronologie',
      items: vocabularies.cronologie?.filter(item => item.is_active !== false) || []
    },
    {
      key: 'indicatori' as keyof MapFilters,
      label: 'Indicatori Cultuali',
      items: vocabularies.indicatori?.filter(item => item.is_active !== false) || []
    },
    {
      key: 'ambiti' as keyof MapFilters,
      label: 'Ambiti Cultuali',
      items: vocabularies.ambiti?.filter(item => item.is_active !== false) || []
    }
  ]

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with active filters count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filtri Avanzati</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCount}
            </Badge>
          )}
        </div>
        
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-6 px-2 text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Filter sections */}
      <ScrollArea className="max-h-80">
        <div className="space-y-4">
          {filterSections.map((section, sectionIndex) => (
            <div key={section.key}>
              {sectionIndex > 0 && <Separator />}
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{section.label}</h4>
                
                {section.items.length > 0 ? (
                  <div className="space-y-2">
                    {section.items.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`filter-${section.key}-${item.id}`}
                          checked={filters[section.key]?.includes(item.id) || false}
                          onCheckedChange={(checked) => 
                            handleFilterChange(section.key, item.id, checked as boolean)
                          }
                        />
                        <label
                          htmlFor={`filter-${section.key}-${item.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {item.label}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Nessun elemento disponibile
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Apply button - removed since filters now apply immediately */}
      
      {/* Active filters summary */}
      {activeCount > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground">Filtri Attivi:</h5>
          <div className="flex flex-wrap gap-1">
            {Object.entries(filters).map(([key, values]) =>
              values?.map((value) => {
                const section = filterSections.find(s => s.key === key)
                const item = section?.items.find(i => i.id === value)
                return item ? (
                  <Badge
                    key={`${key}-${value}`}
                    variant="outline"
                    className="text-xs"
                  >
                    {item.label}
                  </Badge>
                ) : null
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}