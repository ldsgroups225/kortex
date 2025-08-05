"use client";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <button
      className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
      onClick={() => void signOut()}
    >
      Sign out
    </button>
  );
}
