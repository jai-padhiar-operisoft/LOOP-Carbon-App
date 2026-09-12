"use client";

import { useRouter } from "next/navigation";
import { startLoading } from "@/components/PageLoader";

/**
 * Drop-in replacement for useRouter().push that fires the loading screen
 * immediately on every navigation — before Next.js even starts compiling.
 */
export function useNavigation() {
  const router = useRouter();

  function push(href: string) {
    startLoading();
    router.push(href);
  }

  function replace(href: string) {
    startLoading();
    router.replace(href);
  }

  return { push, replace, router };
}
