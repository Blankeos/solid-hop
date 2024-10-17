import { createSignal, type FlowProps } from "solid-js";
import { Head } from "vike-solid/Head";
import { usePageContext } from "vike-solid/usePageContext";

export default function RootLayout(props: FlowProps) {
  const pageContext = usePageContext();

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Demo showcasing Vike" />
        <link rel="icon" href={`${pageContext.urlParsed.origin}/logo.svg`} />
      </Head>

      <div>
        <nav>
          <a href="/">Home</a>
          <span>{" | "}</span>
          <a href="/dashboard">Dashboard</a>
          <span>{" | "}</span>
          <Counter />
        </nav>
        {props.children}
      </div>
    </>
  );
}

function Counter() {
  const [count, setCount] = createSignal(0);

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Root Counter {count()}
    </button>
  );
}
