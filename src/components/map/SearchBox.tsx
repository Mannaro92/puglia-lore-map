import React, { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { searchSites, geocodeAddress, isAddressQuery, SearchResult, GeocodeResult } from '@/lib/search'
import { MapFilters } from '@/lib/mapStyle'
import { useToast } from '@/hooks/use-toast'

interface SearchBoxProps {
  filters?: MapFilters
  onResultSelect?: (result: SearchResult | GeocodeResult) => void
  onGeocodeSelect?: (result: GeocodeResult) => void
  className?: string
}

export const SearchBox: React.FC<SearchBoxProps> = ({
  filters = {},
  onResultSelect,
  onGeocodeSelect,
  className = ''
}) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(SearchResult | GeocodeResult)[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()
  const { toast } = useToast()

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (query.length >= 2) {
      debounceRef.current = setTimeout(() => {
        performSearch(query)
      }, 250)
    } else {
      setResults([])
      setShowResults(false)
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, filters])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showResults || results.length === 0) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
          
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, -1))
          break
          
        case 'Enter':
          event.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultSelect(results[selectedIndex])
          }
          break
          
        case 'Escape':
          setShowResults(false)
          setSelectedIndex(-1)
          inputRef.current?.blur()
          break
      }
    }

    if (showResults) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showResults, results, selectedIndex])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    
    try {
      // Check if query looks like an address
      if (isAddressQuery(searchQuery)) {
        const geocodeResponse = await geocodeAddress(searchQuery)
        
        if (geocodeResponse.success && geocodeResponse.results.length > 0) {
          // Add type to distinguish from site results
          const geocodeResults = geocodeResponse.results.map(result => ({
            ...result,
            type: 'address' as const
          }))
          setResults(geocodeResults)
          setShowResults(true)
          setSelectedIndex(-1)
          setIsLoading(false)
          return
        }
      }
      
      // Search archaeological sites
      const searchResponse = await searchSites({
        q: searchQuery,
        ...filters,
        limit: 10
      })
      
      if (searchResponse.success) {
        // Add type to distinguish from geocode results
        const siteResults = searchResponse.results.map(result => ({
          ...result,
          type: 'site' as const
        }))
        setResults(siteResults)
        setShowResults(true)
        setSelectedIndex(-1)
      } else {
        toast({
          title: 'Errore nella ricerca',
          description: searchResponse.error || 'Si è verificato un errore durante la ricerca',
          variant: 'destructive'
        })
        setResults([])
        setShowResults(false)
      }
    } catch (error) {
      console.error('Search error:', error)
      toast({
        title: 'Errore nella ricerca',
        description: 'Si è verificato un errore durante la ricerca',
        variant: 'destructive'
      })
      setResults([])
      setShowResults(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultSelect = (result: SearchResult | GeocodeResult) => {
    setQuery('')
    setShowResults(false)
    setSelectedIndex(-1)
    
    if ('lat' in result) {
      // Geocode result
      onGeocodeSelect?.(result)
    } else {
      // Site result
      onResultSelect?.(result)
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0) {
      handleResultSelect(results[0])
    } else if (query.length >= 2) {
      performSearch(query)
    }
  }

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="memoir-control">
          <div className="flex items-center">
            <Search className="h-4 w-4 ml-3 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca toponimo, luogo o indirizzo..."
              className="border-0 bg-transparent pl-2 pr-8 focus-visible:ring-0"
              autoComplete="off"
              aria-label="Campo di ricerca"
              aria-expanded={showResults}
              aria-haspopup="listbox"
            />
            
            {isLoading && (
              <Loader2 className="h-4 w-4 mr-3 animate-spin text-muted-foreground" />
            )}
            
            {query && !isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="h-6 w-6 p-0 mr-2"
                aria-label="Cancella ricerca"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </form>
      
      {showResults && results.length > 0 && (
        <Card className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-auto memoir-scroll z-50 memoir-control">
          <div className="py-2">
            {results.map((result, index) => (
              <SearchResultItem
                key={index}
                result={result}
                isSelected={index === selectedIndex}
                onClick={() => handleResultSelect(result)}
              />
            ))}
          </div>
        </Card>
      )}
      
      {showResults && results.length === 0 && !isLoading && query.length >= 2 && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 memoir-control">
          <div className="p-4 text-center text-muted-foreground text-sm">
            Nessun risultato trovato per "{query}"
          </div>
        </Card>
      )}
    </div>
  )
}

interface SearchResultItemProps {
  result: SearchResult | GeocodeResult
  isSelected: boolean
  onClick: () => void
}

const SearchResultItem: React.FC<SearchResultItemProps> = ({
  result,
  isSelected,
  onClick
}) => {
  const isGeocodeResult = 'lat' in result
  
  return (
    <button
      className={`w-full px-4 py-3 text-left hover:bg-accent focus:bg-accent transition-colors ${
        isSelected ? 'bg-accent' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {isGeocodeResult ? (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          ) : (
            <div className="h-2 w-2 rounded-full bg-[hsl(var(--memoir-ruby))]" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm truncate">
            {isGeocodeResult ? result.display_name : result.toponimo}
          </div>
          
          {!isGeocodeResult && (
            <>
              {result.descrizione && (
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {result.descrizione}
                </div>
              )}
              
              {(result.comune || result.provincia) && (
                <div className="text-xs text-muted-foreground mt-1">
                  {[result.comune, result.provincia].filter(Boolean).join(', ')}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </button>
  )
}