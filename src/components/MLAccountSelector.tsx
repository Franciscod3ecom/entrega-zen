import { Check, ChevronsUpDown, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useMLAccount } from "@/contexts/MLAccountContext";

export function MLAccountSelector() {
  const [open, setOpen] = useState(false);
  const { currentAccount, accounts, setCurrentAccount } = useMLAccount();

  if (accounts.length === 0) {
    return null;
  }

  if (accounts.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm bg-muted/50 rounded-md">
        <Store className="h-4 w-4" />
        <span className="font-medium">
          {currentAccount?.nickname || `ML ${currentAccount?.ml_user_id}`}
        </span>
        <span className="text-muted-foreground">({currentAccount?.site_id})</span>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[280px] justify-between"
        >
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4" />
            {currentAccount ? (
              <>
                <span className="font-medium">
                  {currentAccount.nickname || `ML ${currentAccount.ml_user_id}`}
                </span>
                <span className="text-muted-foreground text-xs">
                  ({currentAccount.site_id})
                </span>
              </>
            ) : (
              "Selecione uma conta..."
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandList>
            <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
            <CommandGroup heading="Contas do Mercado Livre">
              {accounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={account.id}
                  onSelect={() => {
                    setCurrentAccount(account);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      currentAccount?.id === account.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {account.nickname || `ML ${account.ml_user_id}`}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Site: {account.site_id} • ID: {account.ml_user_id}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
