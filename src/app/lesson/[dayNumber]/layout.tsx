
export function generateStaticParams() {
  // Generate params for the 90-day training program
  const params: { dayNumber: string }[] = [];
  for (let i = 1; i <= 90; i++) {
    params.push({ dayNumber: i.toString() });
  }
  return params;
}

export default function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
