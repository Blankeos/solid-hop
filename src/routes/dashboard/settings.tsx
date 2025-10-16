import { createFileRoute } from "@tanstack/solid-router";

export const Route = createFileRoute("/dashboard/settings")({});

export default function Page() {
  return (
    <>
      <div>
        <h1>This is the /dashboard/settings</h1>
        <p>Demonstrating nested layout.</p>
      </div>
    </>
  );
}
