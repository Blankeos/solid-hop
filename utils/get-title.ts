const TITLE_TEMPLATE = "%s | Solid Hop";

export default function getTitle(title: string = "Home") {
  return TITLE_TEMPLATE.replace("%s", title);
}
