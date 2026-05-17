# 🐇 Solid Hop

💙 A **minimal** and **unopinionated** Vike + Solid + Hono starter.

❤️ We love Vike and Solid, but it might be overwhelming to setup. The goal of this starter is to get you up and running quickly with good defaults without getting in the way of your opinions.

This is more or less what you would get from a starter with `create next-app` or `create svelte` or `create solid`.

If you want a more opinionated and fully-featured boilerplate instead: http://github.com/blankeos/solid-launch

## Tech Stack:

1. Vike + Hono - For SSR + Your own Server.
2. SolidJS
3. Bun (Can swap this with Node easily if you want).
4. Tools: Biome

## Features:

- [x] 🦋 **Type-safe Routing** - Inspired by TanStack Router, I'm the author of [`vike-routegen`](https://github.com/blankeos/vike-routegen) which codegens typesafe page routing for you, and it's a breeze!
- [x] ⚡️ **Super-fast dev server** - way faster than NextJS thanks to Vite. You need to feel it to believe it! It can also literally build your app in seconds.
- [x] **🥊 Robust Error Practices** - I thoughtfully made sure there's a best practice for errors here already. You can throw errors in a consistent manner in the backend and display them consistently in the frontend.

## Quick Start

1. Get template

```sh
npx gitpick blankeos/solid-hop <your-app-name>
```

1. Install

```sh
bun install
```

3. Run dev server

```sh
bun dev
```

## Building and Deployment

1. Build

```sh
bun run build
```

2. Wherever you deploy, just run make sure that this is ran:

```sh
bun run preview # Just runs server.ts
```
