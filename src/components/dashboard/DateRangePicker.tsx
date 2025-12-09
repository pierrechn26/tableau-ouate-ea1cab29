import { useState, useRef, useEffect } from "react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateRangePickerProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  comparisonPeriod: string;
  onComparisonPeriodChange: (period: string) => void;
  customComparisonRange?: DateRange | undefined;
  onCustomComparisonRangeChange?: (range: DateRange | undefined) => void;
  onApply?: () => void;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  comparisonPeriod,
  onComparisonPeriodChange,
  customComparisonRange,
  onCustomComparisonRangeChange,
  onApply,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  
  // Track if we should reset on next click (when range is complete)
  const shouldResetMain = useRef(false);
  const shouldResetComparison = useRef(false);

  // When main range becomes complete, mark for reset on next click
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      shouldResetMain.current = true;
    }
  }, [dateRange]);

  // When comparison range becomes complete, mark for reset on next click
  useEffect(() => {
    if (customComparisonRange?.from && customComparisonRange?.to) {
      shouldResetComparison.current = true;
    }
  }, [customComparisonRange]);

  const presets = [
    {
      label: "7 derniers jours",
      getValue: () => ({
        from: subDays(new Date(), 6),
        to: new Date(),
      }),
    },
    {
      label: "30 derniers jours",
      getValue: () => ({
        from: subDays(new Date(), 29),
        to: new Date(),
      }),
    },
    {
      label: "Ce mois-ci",
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: new Date(),
      }),
    },
    {
      label: "Mois dernier",
      getValue: () => {
        const lastMonth = subMonths(new Date(), 1);
        return {
          from: startOfMonth(lastMonth),
          to: endOfMonth(lastMonth),
        };
      },
    },
  ];

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      onDateRangeChange(undefined);
      return;
    }

    // If range was complete and user clicks, start fresh with clicked date
    if (shouldResetMain.current && range.from) {
      // Find which date was just clicked by comparing with previous range
      // react-day-picker returns the new range, we need to find the clicked date
      if (dateRange?.from && dateRange?.to) {
        // If the range.to changed, user clicked a new end date after the current range
        // If the range.from changed, user clicked a new start date
        // We want to reset to just the clicked date
        
        // The clicked date is typically the one that's different
        const clickedDate = range.to && range.to.getTime() !== dateRange.to?.getTime() 
          ? range.to 
          : range.from;
        
        shouldResetMain.current = false;
        onDateRangeChange({ from: clickedDate, to: undefined });
        return;
      }
    }

    shouldResetMain.current = false;
    onDateRangeChange(range);
  };

  // Handle custom comparison date range selection
  const handleCustomComparisonSelect = (range: DateRange | undefined) => {
    if (!range) {
      onCustomComparisonRangeChange?.(undefined);
      return;
    }

    if (shouldResetComparison.current && range.from) {
      if (customComparisonRange?.from && customComparisonRange?.to) {
        const clickedDate = range.to && range.to.getTime() !== customComparisonRange.to?.getTime() 
          ? range.to 
          : range.from;
        
        shouldResetComparison.current = false;
        onCustomComparisonRangeChange?.({ from: clickedDate, to: undefined });
        return;
      }
    }

    shouldResetComparison.current = false;
    onCustomComparisonRangeChange?.(range);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal bg-card border-border hover:bg-secondary/50",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM yyyy")} -{" "}
                    {format(dateRange.to, "dd MMM yyyy")}
                  </>
                ) : (
                  <>{format(dateRange.from, "dd MMM yyyy")} - ...</>
                )
              ) : (
                "Sélectionner une période"
              )}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <div className="border-r border-border p-3 space-y-2">
              <p className="text-sm font-medium text-foreground mb-2">Raccourcis</p>
              {presets.map((preset) => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  className="w-full justify-start text-left font-normal"
                  onClick={() => {
                    onDateRangeChange(preset.getValue());
                    setIsOpen(false);
                  }}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeSelect}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>
        </PopoverContent>
      </Popover>

      <Select value={comparisonPeriod} onValueChange={onComparisonPeriodChange}>
        <SelectTrigger className="w-[200px] bg-card border-border">
          <SelectValue placeholder="Comparer avec..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="previous">Période précédente</SelectItem>
          <SelectItem value="previous-year">Année précédente</SelectItem>
          <SelectItem value="previous-month">Mois précédent</SelectItem>
          <SelectItem value="custom">Période personnalisée</SelectItem>
          <SelectItem value="none">Aucune comparaison</SelectItem>
        </SelectContent>
      </Select>

      {comparisonPeriod === "custom" && onCustomComparisonRangeChange && (
        <Popover open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal bg-card border-border hover:bg-secondary/50",
                !customComparisonRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {customComparisonRange?.from ? (
                  customComparisonRange.to ? (
                    <>
                      {format(customComparisonRange.from, "dd MMM yyyy")} -{" "}
                      {format(customComparisonRange.to, "dd MMM yyyy")}
                    </>
                  ) : (
                    <>{format(customComparisonRange.from, "dd MMM yyyy")} - ...</>
                  )
                ) : (
                  "Période de comparaison"
                )}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex">
              <div className="border-r border-border p-3 space-y-2">
                <p className="text-sm font-medium text-foreground mb-2">Raccourcis</p>
                {presets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="ghost"
                    className="w-full justify-start text-left font-normal"
                    onClick={() => {
                      onCustomComparisonRangeChange(preset.getValue());
                      setIsComparisonOpen(false);
                    }}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={customComparisonRange?.from}
                selected={customComparisonRange}
                onSelect={handleCustomComparisonSelect}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto")}
              />
            </div>
          </PopoverContent>
        </Popover>
      )}

      {onApply && (
        <Button onClick={onApply} size="sm" className="ml-auto">
          Actualiser
        </Button>
      )}
    </div>
  );
}
