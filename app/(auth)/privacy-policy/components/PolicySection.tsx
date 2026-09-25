import type { ReactNode } from "react";

type PolicySectionProps = {
  title: string;
  children: ReactNode;
};

export function PolicySection({ title, children }: PolicySectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
