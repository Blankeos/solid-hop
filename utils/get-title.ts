const TITLE_TEMPLATE = "%s | Vike Solid";

export default function getTitle(title: string = "Home") {
  return TITLE_TEMPLATE.replace("%s", title);
}
