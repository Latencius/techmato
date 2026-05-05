export function buildTitle(stories: { title: string }[]): string {
  const first = stories[0]?.title.trim();
  if (!first) {
    return "(無題)";
  }

  const head = first.length > 40 ? `${first.slice(0, 40)}...` : first;
  const remaining = stories.length - 1;

  return remaining > 0 ? `${head} ほか${remaining}件` : head;
}
