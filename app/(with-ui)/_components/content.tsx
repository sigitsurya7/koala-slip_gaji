"use client";

export function AdminContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-0 overflow-auto bg-background px-4 sm:px-6 lg:px-8 pb-10 pt-6">
      <div className="max-w-7xl mx-auto">{children}</div>
    </div>
  );
}
