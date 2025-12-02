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
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  comparisonPeriod,
  onComparisonPeriodChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

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

  return (
    <div className="flex flex-col sm:flex-row gap-3">
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
              onSelect={onDateRangeChange}
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
          <SelectItem value="none">Aucune comparaison</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
