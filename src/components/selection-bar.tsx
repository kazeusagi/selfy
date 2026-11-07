import type { LucideIcon } from "lucide-react";
import { XIcon } from "lucide-react";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export type SelectionAction = {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
};

// スマホでは画面下いっぱいに、PC では下に浮かせて出す
export function SelectionBar({
  count,
  total,
  actions,
  onSelectAll,
  onClose,
}: {
  count: number;
  total: number;
  actions: SelectionAction[];
  onSelectAll: (selected: boolean) => void;
  onClose: () => void;
}) {
  const allSelected = count > 0 && count === total;
  return (
    <div
      role="toolbar"
      aria-label="選択した写真の操作"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center md:bottom-6 md:px-4"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-popover py-1.5 pr-2 pl-1.5 shadow-lg max-md:w-full max-md:flex-col max-md:items-stretch max-md:gap-0 max-md:rounded-none max-md:border-x-0 max-md:border-b-0 max-md:p-0 max-md:pb-[env(safe-area-inset-bottom)] max-md:shadow-none">
        <div className="flex items-center gap-1 max-md:h-12 max-md:px-1.5">
          <button
            type="button"
            aria-label="選択をやめる"
            onClick={onClose}
            className="flex size-10 cursor-pointer items-center justify-center rounded-full hover:bg-muted"
          >
            <XIcon className="size-5" />
          </button>
          <span className="min-w-[88px] text-sm font-semibold whitespace-nowrap max-md:flex-1">
            {formatCount(count)} 枚を選択
          </span>
          <button
            type="button"
            onClick={() => onSelectAll(!allSelected)}
            className="h-10 cursor-pointer rounded-full px-3 text-sm font-medium whitespace-nowrap text-link-hover hover:bg-muted"
          >
            {allSelected ? "すべて解除" : "すべて選択"}
          </button>
        </div>
        <div className="mx-1 h-6 w-px bg-border max-md:hidden" />
        <div className="flex items-center gap-1 max-md:h-16 max-md:justify-around max-md:border-t max-md:border-border max-md:px-2">
          {actions.map(({ label, icon: Icon, onClick, disabled, destructive }) => (
            <button
              key={label}
              type="button"
              disabled={disabled || count === 0}
              onClick={onClick}
              className={cn(
                "flex h-10 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap enabled:hover:bg-muted disabled:cursor-default disabled:opacity-40 max-md:h-14 max-md:flex-1 max-md:flex-col max-md:justify-center max-md:gap-1 max-md:px-1 max-md:text-[11px]",
                destructive && "text-destructive",
              )}
            >
              <Icon className="size-[18px] max-md:size-[22px]" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
