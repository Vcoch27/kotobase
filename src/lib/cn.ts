import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Hàm tiện ích kết hợp clsx + tailwind-merge.
 * Giải quyết xung đột class Tailwind và hỗ trợ class có điều kiện.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
