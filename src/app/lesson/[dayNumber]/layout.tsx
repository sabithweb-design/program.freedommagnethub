
export function generateStaticParams() {
  const lessonCounts = [90, 60, 30]; 
  const params: { dayNumber: string }[] = [];

  lessonCounts.forEach((count) => {
    for (let i = 1; i <= count; i++) {
      params.push({ dayNumber: i.toString() });
    }
  });

  return params;
}

export default function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
