"use client";

import { LucideIcon } from "lucide-react";
import {
    Text,
    CheckCheck,
    ArrowDownWideNarrow,
    CornerRightDown,
} from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface ActionItem {
    text: string;
    icon: LucideIcon;
    colors: {
        icon: string;
        border: string;
        bg: string;
    };
}

interface AIInputWithSuggestionsProps {
    id?: string;
    placeholder?: string;
    minHeight?: number;
    maxHeight?: number;
    actions?: ActionItem[];
    defaultSelected?: string;
    onSubmit?: (text: string, action?: string) => void;
    className?: string;
}

const DEFAULT_ACTIONS: ActionItem[] = [
    {
        text: "Summary",
        icon: Text,
        colors: {
            icon: "text-orange-600",
            border: "border-orange-500",
            bg: "bg-orange-100",
        },
    },
    {
        text: "Fix Spelling and Grammar",
        icon: CheckCheck,
        colors: {
            icon: "text-emerald-600",
            border: "border-emerald-500",
            bg: "bg-emerald-100",
        },
    },
    {
        text: "Make shorter",
        icon: ArrowDownWideNarrow,
        colors: {
            icon: "text-purple-600",
            border: "border-purple-500",
            bg: "bg-purple-100",
        },
    },
];

export function AIInputWithSuggestions({
    id = "ai-input-with-actions",
    placeholder = "Enter your text here...",
    minHeight = 64,
    maxHeight = 200,
    actions = DEFAULT_ACTIONS,
    defaultSelected,
    onSubmit,
    className
}: AIInputWithSuggestionsProps) {
    const [inputValue, setInputValue] = useState("");
    const [selectedItem, setSelectedItem] = useState<string | null>(defaultSelected ?? null);

    const { textareaRef, adjustHeight } = useAutoResizeTextarea({
        minHeight,
        maxHeight,
    });

    const toggleItem = (itemText: string) => {
        setSelectedItem((prev) => (prev === itemText ? null : itemText));
    };

    const currentItem = selectedItem
        ? actions.find((item) => item.text === selectedItem)
        : null;

    const handleSubmit = () => {
        if (inputValue.trim()) {
            onSubmit?.(inputValue, selectedItem ?? undefined);
            setInputValue("");
            setSelectedItem(null);
            adjustHeight(true); // Reset height after submit
        }
    };

    return (
        <div className={cn("w-full py-4", className)}>
            <div className="relative max-w-xl w-full mx-auto">
                {/* Added dark mode background and border */}
                <div className="relative border border-black/10 dark:border-white/20 focus-within:border-black/20 dark:focus-within:border-white/20 rounded-2xl bg-white dark:bg-gray-800 shadow-sm">
                    <div className="flex flex-col">
                        <div
                            className="overflow-y-auto"
                            // Adjusted max height calculation to account for padding/border
                            style={{ maxHeight: `${maxHeight}px` }}
                        >
                            <Textarea
                                ref={textareaRef}
                                id={id}
                                placeholder={placeholder}
                                className={cn(
                                    "max-w-xl w-full rounded-t-2xl pr-10 pl-4 pt-3 pb-3 placeholder:text-black/50 dark:placeholder:text-white/50 border-none focus:ring-0 text-black dark:text-white resize-none text-wrap bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 leading-[1.4]",
                                    `min-h-[${minHeight}px]` // Ensure minHeight is applied
                                )}
                                value={inputValue}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                    setInputValue(e.target.value);
                                    adjustHeight();
                                }}
                                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit();
                                    }
                                }}
                            />
                        </div>

                        {/* Action buttons area */}
                        <div className="h-12 bg-transparent px-3 pb-2 flex items-end">
                            {currentItem && (
                                <div className="absolute left-3 bottom-3 z-10">
                                    <button
                                        type="button"
                                        onClick={handleSubmit}
                                        className={cn(
                                            "inline-flex items-center gap-1.5",
                                            "border shadow-sm rounded-md px-2 py-0.5 text-xs font-medium",
                                            "animate-fadeIn hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-200",
                                            currentItem.colors.bg,
                                            currentItem.colors.border
                                        )}
                                    >
                                        <currentItem.icon
                                            className={`w-3.5 h-3.5 ${currentItem.colors.icon}`}
                                        />
                                        <span
                                            className={currentItem.colors.icon}
                                        >
                                            {selectedItem}
                                        </span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Submit Icon - positioned better */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!inputValue.trim()}
                        className={cn(
                            "absolute right-3 bottom-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200",
                            inputValue.trim()
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed",
                            "disabled:opacity-50"
                        )}
                        aria-label="Submit"
                    >
                        <CornerRightDown
                            className={cn(
                                "w-4 h-4 transition-opacity duration-200",
                                // Icon color handled by button background
                            )}
                        />
                    </button>
                </div>
            </div>
            {/* Suggestion buttons */}
            <div className="flex flex-wrap gap-1.5 mt-3 max-w-xl mx-auto justify-start px-4">
                {actions.filter((item) => item.text !== selectedItem).map(
                    ({ text, icon: Icon, colors }) => (
                        <button
                            type="button"
                            key={text}
                            className={cn(
                                "px-3 py-1.5 text-xs font-medium rounded-full",
                                "border transition-all duration-200",
                                "border-black/10 dark:border-white/20 bg-white dark:bg-gray-700 hover:bg-black/5 dark:hover:bg-white/10",
                                "flex-shrink-0"
                            )}
                            onClick={() => toggleItem(text)}
                        >
                            <div className="flex items-center gap-1.5">
                                <Icon className={cn("h-4 w-4", colors.icon)} />
                                <span className="text-black/70 dark:text-white/80 whitespace-nowrap">
                                    {text}
                                </span>
                            </div>
                        </button>
                    )
                )}
            </div>
        </div>
    );
}