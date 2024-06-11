import { usePageContext } from "vike-solid/usePageContext";

export default function DefaultHead() {
  const { urlParsed } = usePageContext();

  return (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta name="description" content="Demo showcasing Vike" />
      <link rel="icon" href={`${urlParsed.origin}/logo.svg`} />
    </>
  );
}
