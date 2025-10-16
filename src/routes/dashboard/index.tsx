import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/dashboard/")({});

export default function Page() {
  return (
    <>
      <div>
        <h1>This is the /dashboard</h1>
        <p>Demonstrating nested layout.</p>
      </div>
    </>
  );
}
