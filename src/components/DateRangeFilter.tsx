import { useState } from "react";
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
import { CalendarIcon } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type DatePreset = "today" | "7days" | "15days" | "30days" | "this_month" | "last_month" | "custom";

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DatePreset;
  customRange?: DateRange;
  onChange: (preset: DatePreset, range: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, customRange, onChange, className }: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange | undefined>(customRange);

  const getPresetRange = (preset: DatePreset): DateRange => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case "today":
        return { from: today, to: now };
      case "7days":
        return { from: subDays(today, 7), to: now };
      case "15days":
        return { from: subDays(today, 15), to: now };
      case "30days":
        return { from: subDays(today, 30), to: now };
      case "this_month":
        return { from: startOfMonth(today), to: endOfMonth(today) };
      case "last_month":
        const lastMonth = subMonths(today, 1);
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
      case "custom":
        return customRange || { from: subDays(today, 7), to: now };
      default:
        return { from: subDays(today, 7), to: now };
    }
  };

  const handlePresetChange = (preset: DatePreset) => {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }
    setShowCustom(false);
    onChange(preset, getPresetRange(preset));
  };

  const handleCustomConfirm = () => {
    if (tempRange) {
      onChange("custom", tempRange);
      setShowCustom(false);
    }
  };

  const getPresetLabel = (preset: DatePreset): string => {
    switch (preset) {
      case "today": return "Hoje";
      case "7days": return "Últimos 7 dias";
      case "15days": return "Últimos 15 dias";
      case "30days": return "Últimos 30 dias";
      case "this_month": return "Este mês";
      case "last_month": return "Mês passado";
      case "custom": 
        if (customRange) {
          return `${format(customRange.from, "dd/MM")} - ${format(customRange.to, "dd/MM")}`;
        }
        return "Personalizado";
      default: return "Selecionar";
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={value} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
        <SelectTrigger className="w-[180px] h-11 rounded-xl">
          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue>{getPresetLabel(value)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Hoje</SelectItem>
          <SelectItem value="7days">Últimos 7 dias</SelectItem>
          <SelectItem value="15days">Últimos 15 dias</SelectItem>
          <SelectItem value="30days">Últimos 30 dias</SelectItem>
          <SelectItem value="this_month">Este mês</SelectItem>
          <SelectItem value="last_month">Mês passado</SelectItem>
          <SelectItem value="custom">Personalizado...</SelectItem>
        </SelectContent>
      </Select>

      {showCustom && (
        <Popover open={showCustom} onOpenChange={setShowCustom}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-11 rounded-xl">
              {tempRange ? (
                <>
                  {format(tempRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                  {format(tempRange.to, "dd/MM/yyyy", { locale: ptBR })}
                </>
              ) : (
                "Selecionar datas"
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={tempRange ? { from: tempRange.from, to: tempRange.to } : undefined}
              onSelect={(range) => {
                if (range?.from && range?.to) {
                  setTempRange({ from: range.from, to: range.to });
                } else if (range?.from) {
                  setTempRange({ from: range.from, to: range.from });
                }
              }}
              numberOfMonths={2}
              locale={ptBR}
            />
            <div className="p-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowCustom(false)}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCustomConfirm} disabled={!tempRange}>
                Aplicar
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
