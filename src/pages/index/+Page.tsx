import { honoClient } from "@/lib/hono-client"
import getTitle from "@/utils/get-title"
import { createResource, createSignal } from "solid-js"
import { useMetadata } from "vike-metadata-solid"

export default function Page() {
  useMetadata({
    title: getTitle("Home"),
  })

  const [data] = createResource(async () => {
    const res = await honoClient.todos.$get()
    return res.json()
  })

  return (
    <>
      <div>
        <h1>My Vike + Solid app</h1>
        This page is:
        <ul>
          <li>Rendered to HTML.</li>
          <li>
            Interactive. <Counter />
          </li>
          <li>
            Working fetch: {data.loading ? "Loading..." : data.error ? `Error: ${data.error.message}` : JSON.stringify(data())}
          </li>
        </ul>
      </div>
    </>
  )
}

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button type="button" onClick={() => setCount((count) => count + 1)}>
      Counter {count()}
    </button>
  )
}
