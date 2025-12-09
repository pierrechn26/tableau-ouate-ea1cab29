import { useState } from "react";
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

  // Handle date range selection - reset when a full range exists and user clicks a new date
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    // If we already have a complete range (both from and to), and user clicks a new date,
    // start fresh with just the new date as 'from'
    if (dateRange?.from && dateRange?.to && range?.from) {
      // Check if the new selection is different from current range
      const isNewSelection = range.from.getTime() !== dateRange.from.getTime() && 
                            range.from.getTime() !== dateRange.to.getTime();
      if (isNewSelection && !range.to) {
        // User clicked a new date, start fresh selection
        onDateRangeChange({ from: range.from, to: undefined });
        return;
      }
    }
    onDateRangeChange(range);
  };

  // Handle custom comparison date range selection
  const handleCustomComparisonSelect = (range: DateRange | undefined) => {
    if (customComparisonRange?.from && customComparisonRange?.to && range?.from) {
      const isNewSelection = range.from.getTime() !== customComparisonRange.from.getTime() && 
                            range.from.getTime() !== customComparisonRange.to.getTime();
      if (isNewSelection && !range.to) {
        onCustomComparisonRangeChange?.({ from: range.from, to: undefined });
        return;
      }
    }
    onCustomComparisonRangeChange?.(range);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal bg-card border-border hover:bg-secondary/50",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "dd MMM yyyy")} -{" "}
                  {format(dateRange.to, "dd MMM yyyy")}
                </>
              ) : (
                format(dateRange.from, "dd MMM yyyy")
              )
            ) : (
              <span>Sélectionner une période</span>
            )}
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
                "justify-start text-left font-normal bg-card border-border hover:bg-secondary/50",
                !customComparisonRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {customComparisonRange?.from ? (
                customComparisonRange.to ? (
                  <>
                    {format(customComparisonRange.from, "dd MMM yyyy")} -{" "}
                    {format(customComparisonRange.to, "dd MMM yyyy")}
                  </>
                ) : (
                  format(customComparisonRange.from, "dd MMM yyyy")
                )
              ) : (
                <span>Période de comparaison</span>
              )}
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
