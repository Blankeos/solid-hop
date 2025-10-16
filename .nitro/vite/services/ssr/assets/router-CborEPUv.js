import { r as rootRouteId, i as invariant, t as trimPathLeft, j as joinPaths, s as splitProps, c as createMemo, a as createComponent, m as mergeProps, D as Dynamic, u as useRouter, b as useRouterState, d as useIntersectionObserver, e as createSignal, f as functionalUpdate, g as exactPathTest, h as removeTrailingSlash, k as deepEqual, l as useContext, n as dummyMatchContext, o as matchContext, w as warning, p as isModuleNotFoundError, q as createResource, R as RouterCore, O as Outlet, v as ssr, H as HeadContent, x as escape, y as ssrHydrationKey, S as Scripts } from "../server.js";
const preloadWarning = "Error preloading route! ☝️";
class BaseRoute {
  constructor(options) {
    this.init = (opts) => {
      this.originalIndex = opts.originalIndex;
      const options2 = this.options;
      const isRoot = !options2?.path && !options2?.id;
      this.parentRoute = this.options.getParentRoute?.();
      if (isRoot) {
        this._path = rootRouteId;
      } else if (!this.parentRoute) {
        invariant(
          false,
          `Child Route instances must pass a 'getParentRoute: () => ParentRoute' option that returns a Route instance.`
        );
      }
      let path = isRoot ? rootRouteId : options2?.path;
      if (path && path !== "/") {
        path = trimPathLeft(path);
      }
      const customId = options2?.id || path;
      let id = isRoot ? rootRouteId : joinPaths([
        this.parentRoute.id === rootRouteId ? "" : this.parentRoute.id,
        customId
      ]);
      if (path === rootRouteId) {
        path = "/";
      }
      if (id !== rootRouteId) {
        id = joinPaths(["/", id]);
      }
      const fullPath = id === rootRouteId ? "/" : joinPaths([this.parentRoute.fullPath, path]);
      this._path = path;
      this._id = id;
      this._fullPath = fullPath;
      this._to = fullPath;
    };
    this.clone = (other) => {
      this._path = other._path;
      this._id = other._id;
      this._fullPath = other._fullPath;
      this._to = other._to;
      this.options.getParentRoute = other.options.getParentRoute;
      this.children = other.children;
    };
    this.addChildren = (children) => {
      return this._addFileChildren(children);
    };
    this._addFileChildren = (children) => {
      if (Array.isArray(children)) {
        this.children = children;
      }
      if (typeof children === "object" && children !== null) {
        this.children = Object.values(children);
      }
      return this;
    };
    this._addFileTypes = () => {
      return this;
    };
    this.updateLoader = (options2) => {
      Object.assign(this.options, options2);
      return this;
    };
    this.update = (options2) => {
      Object.assign(this.options, options2);
      return this;
    };
    this.lazy = (lazyFn) => {
      this.lazyFn = lazyFn;
      return this;
    };
    this.options = options || {};
    this.isRoot = !options?.getParentRoute;
    if (options?.id && options?.path) {
      throw new Error(`Route cannot have both an 'id' and a 'path' option.`);
    }
  }
  get to() {
    return this._to;
  }
  get id() {
    return this._id;
  }
  get path() {
    return this._path;
  }
  get fullPath() {
    return this._fullPath;
  }
}
class BaseRootRoute extends BaseRoute {
  constructor(options) {
    super(options);
  }
}
function chain(callbacks) {
  return (...args) => {
    for (const callback of callbacks)
      callback && callback(...args);
  };
}
function mergeRefs(...refs) {
  return chain(refs);
}
function useLinkProps(options) {
  const router2 = useRouter();
  const [isTransitioning, setIsTransitioning] = createSignal(false);
  const [local, rest] = splitProps(mergeProps({
    activeProps: () => ({
      class: "active"
    }),
    inactiveProps: () => ({})
  }, options), ["activeProps", "inactiveProps", "activeOptions", "to", "preload", "preloadDelay", "hashScrollIntoView", "replace", "startTransition", "resetScroll", "viewTransition", "target", "disabled", "style", "class", "onClick", "onFocus", "onMouseEnter", "onMouseLeave", "onMouseOver", "onMouseOut", "onTouchStart", "ignoreBlocker"]);
  const [_, propsSafeToSpread] = splitProps(rest, ["params", "search", "hash", "state", "mask", "reloadDocument", "unsafeRelative"]);
  const currentSearch = useRouterState({
    select: (s) => s.location.searchStr
  });
  const from = options.from;
  const _options = () => {
    return {
      ...options,
      from
    };
  };
  const next = createMemo(() => {
    currentSearch();
    return router2.buildLocation(_options());
  });
  const hrefOption = createMemo(() => {
    if (_options().disabled) {
      return void 0;
    }
    let href;
    const maskedLocation = next().maskedLocation;
    if (maskedLocation) {
      href = maskedLocation.url;
    } else {
      href = next().url;
    }
    let external = false;
    if (router2.origin) {
      if (href.startsWith(router2.origin)) {
        href = router2.history.createHref(href.replace(router2.origin, ""));
      } else {
        external = true;
      }
    }
    return {
      href,
      external
    };
  });
  const externalLink = createMemo(() => {
    const _href = hrefOption();
    if (_href?.external) {
      return _href.href;
    }
    try {
      new URL(_options().to);
      return _options().to;
    } catch {
    }
    return void 0;
  });
  const preload = createMemo(() => {
    if (_options().reloadDocument || externalLink()) {
      return false;
    }
    return local.preload ?? router2.options.defaultPreload;
  });
  const preloadDelay = () => local.preloadDelay ?? router2.options.defaultPreloadDelay ?? 0;
  const isActive = useRouterState({
    select: (s) => {
      if (externalLink()) return false;
      if (local.activeOptions?.exact) {
        const testExact = exactPathTest(s.location.pathname, next().pathname, router2.basepath);
        if (!testExact) {
          return false;
        }
      } else {
        const currentPathSplit = removeTrailingSlash(s.location.pathname, router2.basepath).split("/");
        const nextPathSplit = removeTrailingSlash(next()?.pathname, router2.basepath)?.split("/");
        const pathIsFuzzyEqual = nextPathSplit?.every((d, i) => d === currentPathSplit[i]);
        if (!pathIsFuzzyEqual) {
          return false;
        }
      }
      if (local.activeOptions?.includeSearch ?? true) {
        const searchTest = deepEqual(s.location.search, next().search, {
          partial: !local.activeOptions?.exact,
          ignoreUndefined: !local.activeOptions?.explicitUndefined
        });
        if (!searchTest) {
          return false;
        }
      }
      if (local.activeOptions?.includeHash) {
        return s.location.hash === next().hash;
      }
      return true;
    }
  });
  const doPreload = () => router2.preloadRoute(_options()).catch((err) => {
    console.warn(err);
    console.warn(preloadWarning);
  });
  const preloadViewportIoCallback = (entry) => {
    if (entry?.isIntersecting) {
      doPreload();
    }
  };
  const [ref, setRef] = createSignal(null);
  useIntersectionObserver(ref, preloadViewportIoCallback, {}, {
    disabled: !!local.disabled || !(preload() === "viewport")
  });
  if (externalLink()) {
    return mergeProps(propsSafeToSpread, {
      ref,
      href: externalLink
    }, splitProps(local, ["target", "disabled", "style", "class", "onClick", "onFocus", "onMouseEnter", "onMouseLeave", "onMouseOut", "onMouseOver", "onTouchStart"])[0]);
  }
  const handleClick = (e) => {
    const elementTarget = e.currentTarget.target;
    const effectiveTarget = local.target !== void 0 ? local.target : elementTarget;
    if (!local.disabled && !isCtrlEvent(e) && !e.defaultPrevented && (!effectiveTarget || effectiveTarget === "_self") && e.button === 0) {
      e.preventDefault();
      setIsTransitioning(true);
      const unsub = router2.subscribe("onResolved", () => {
        unsub();
        setIsTransitioning(false);
      });
      router2.navigate({
        ..._options(),
        replace: local.replace,
        resetScroll: local.resetScroll,
        hashScrollIntoView: local.hashScrollIntoView,
        startTransition: local.startTransition,
        viewTransition: local.viewTransition,
        ignoreBlocker: local.ignoreBlocker
      });
    }
  };
  const handleFocus = (_2) => {
    if (local.disabled) return;
    if (preload()) {
      doPreload();
    }
  };
  const handleTouchStart = handleFocus;
  const handleEnter = (e) => {
    if (local.disabled) return;
    const eventTarget = e.target || {};
    if (preload()) {
      if (eventTarget.preloadTimeout) {
        return;
      }
      eventTarget.preloadTimeout = setTimeout(() => {
        eventTarget.preloadTimeout = null;
        doPreload();
      }, preloadDelay());
    }
  };
  const handleLeave = (e) => {
    if (local.disabled) return;
    const eventTarget = e.target || {};
    if (eventTarget.preloadTimeout) {
      clearTimeout(eventTarget.preloadTimeout);
      eventTarget.preloadTimeout = null;
    }
  };
  function callHandler(event, handler) {
    if (handler) {
      if (typeof handler === "function") {
        handler(event);
      } else {
        handler[0](handler[1], event);
      }
    }
    return event.defaultPrevented;
  }
  function composeEventHandlers(handlers) {
    return (event) => {
      for (const handler of handlers) {
        callHandler(event, handler);
      }
    };
  }
  const resolvedActiveProps = () => isActive() ? functionalUpdate(local.activeProps, {}) ?? {} : {};
  const resolvedInactiveProps = () => isActive() ? {} : functionalUpdate(local.inactiveProps, {});
  const resolvedClassName = () => [local.class, resolvedActiveProps().class, resolvedInactiveProps().class].filter(Boolean).join(" ");
  const resolvedStyle = () => ({
    ...local.style,
    ...resolvedActiveProps().style,
    ...resolvedInactiveProps().style
  });
  return mergeProps(propsSafeToSpread, resolvedActiveProps, resolvedInactiveProps, () => {
    return {
      href: hrefOption()?.href,
      ref: mergeRefs(setRef, _options().ref),
      onClick: composeEventHandlers([local.onClick, handleClick]),
      onFocus: composeEventHandlers([local.onFocus, handleFocus]),
      onMouseEnter: composeEventHandlers([local.onMouseEnter, handleEnter]),
      onMouseOver: composeEventHandlers([local.onMouseOver, handleEnter]),
      onMouseLeave: composeEventHandlers([local.onMouseLeave, handleLeave]),
      onMouseOut: composeEventHandlers([local.onMouseOut, handleLeave]),
      onTouchStart: composeEventHandlers([local.onTouchStart, handleTouchStart]),
      disabled: !!local.disabled,
      target: local.target,
      ...Object.keys(resolvedStyle).length && {
        style: resolvedStyle
      },
      ...resolvedClassName() && {
        class: resolvedClassName()
      },
      ...local.disabled && {
        role: "link",
        "aria-disabled": true
      },
      ...isActive() && {
        "data-status": "active",
        "aria-current": "page"
      },
      ...isTransitioning() && {
        "data-transitioning": "transitioning"
      }
    };
  });
}
const Link = (props) => {
  const [local, rest] = splitProps(props, ["_asChild", "children"]);
  const [_, linkProps] = splitProps(useLinkProps(rest), ["type"]);
  const children = createMemo(() => {
    const ch = local.children;
    if (typeof ch === "function") {
      return ch({
        get isActive() {
          return linkProps["data-status"] === "active";
        },
        isTransitioning: false
      });
    }
    return ch;
  });
  return createComponent(Dynamic, mergeProps({
    get component() {
      return local._asChild ? local._asChild : "a";
    }
  }, linkProps, {
    get children() {
      return children();
    }
  }));
};
function isCtrlEvent(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
function useMatch(opts) {
  const nearestMatchId = useContext(opts.from ? dummyMatchContext : matchContext);
  const matchSelection = useRouterState({
    select: (state) => {
      const match = state.matches.find((d) => opts.from ? opts.from === d.routeId : d.id === nearestMatchId());
      invariant(!((opts.shouldThrow ?? true) && !match), `Could not find ${opts.from ? `an active match from "${opts.from}"` : "a nearest match!"}`);
      if (match === void 0) {
        return void 0;
      }
      return opts.select ? opts.select(match) : match;
    }
  });
  return matchSelection;
}
function useLoaderData(opts) {
  return useMatch({
    from: opts.from,
    strict: opts.strict,
    select: (s) => {
      return opts.select ? opts.select(s.loaderData) : s.loaderData;
    }
  });
}
function useLoaderDeps(opts) {
  const {
    select,
    ...rest
  } = opts;
  return useMatch({
    ...rest,
    select: (s) => {
      return select ? select(s.loaderDeps) : s.loaderDeps;
    }
  });
}
function useParams(opts) {
  return useMatch({
    from: opts.from,
    shouldThrow: opts.shouldThrow,
    strict: opts.strict,
    select: (match) => {
      const params = opts.strict === false ? match.params : match._strictParams;
      return opts.select ? opts.select(params) : params;
    }
  });
}
function useSearch(opts) {
  return useMatch({
    from: opts.from,
    strict: opts.strict,
    shouldThrow: opts.shouldThrow,
    select: (match) => {
      return opts.select ? opts.select(match.search) : match.search;
    }
  });
}
function useNavigate(_defaultOpts) {
  const router2 = useRouter();
  return (options) => {
    return router2.navigate({
      ...options,
      from: options.from ?? _defaultOpts?.from
    });
  };
}
let Route$5 = class Route extends BaseRoute {
  /**
   * @deprecated Use the `createRoute` function instead.
   */
  constructor(options) {
    super(options);
    this.useMatch = (opts) => {
      return useMatch({
        select: opts?.select,
        from: this.id
      });
    };
    this.useRouteContext = (opts) => {
      return useMatch({
        ...opts,
        from: this.id,
        select: (d) => opts?.select ? opts.select(d.context) : d.context
      });
    };
    this.useSearch = (opts) => {
      return useSearch({
        select: opts?.select,
        from: this.id
      });
    };
    this.useParams = (opts) => {
      return useParams({
        select: opts?.select,
        from: this.id
      });
    };
    this.useLoaderDeps = (opts) => {
      return useLoaderDeps({
        ...opts,
        from: this.id
      });
    };
    this.useLoaderData = (opts) => {
      return useLoaderData({
        ...opts,
        from: this.id
      });
    };
    this.useNavigate = () => {
      return useNavigate({
        from: this.fullPath
      });
    };
    this.Link = (props) => {
      const _self$ = this;
      return createComponent(Link, mergeProps({
        get from() {
          return _self$.fullPath;
        }
      }, props));
    };
  }
};
function createRoute(options) {
  return new Route$5(options);
}
class RootRoute extends BaseRootRoute {
  /**
   * @deprecated `RootRoute` is now an internal implementation detail. Use `createRootRoute()` instead.
   */
  constructor(options) {
    super(options);
    this.useMatch = (opts) => {
      return useMatch({
        select: opts?.select,
        from: this.id
      });
    };
    this.useRouteContext = (opts) => {
      return useMatch({
        ...opts,
        from: this.id,
        select: (d) => opts?.select ? opts.select(d.context) : d.context
      });
    };
    this.useSearch = (opts) => {
      return useSearch({
        select: opts?.select,
        from: this.id
      });
    };
    this.useParams = (opts) => {
      return useParams({
        select: opts?.select,
        from: this.id
      });
    };
    this.useLoaderDeps = (opts) => {
      return useLoaderDeps({
        ...opts,
        from: this.id
      });
    };
    this.useLoaderData = (opts) => {
      return useLoaderData({
        ...opts,
        from: this.id
      });
    };
    this.useNavigate = () => {
      return useNavigate({
        from: this.fullPath
      });
    };
    this.Link = (props) => {
      const _self$2 = this;
      return createComponent(Link, mergeProps({
        get from() {
          return _self$2.fullPath;
        }
      }, props));
    };
  }
}
function createRootRoute(options) {
  return new RootRoute(options);
}
function createFileRoute(path) {
  if (typeof path === "object") {
    return new FileRoute(path, {
      silent: true
    }).createRoute(path);
  }
  return new FileRoute(path, {
    silent: true
  }).createRoute;
}
class FileRoute {
  constructor(path, _opts) {
    this.path = path;
    this.createRoute = (options) => {
      warning(this.silent, "FileRoute is deprecated and will be removed in the next major version. Use the createFileRoute(path)(options) function instead.");
      const route = createRoute(options);
      route.isRoot = false;
      return route;
    };
    this.silent = _opts?.silent;
  }
}
class LazyRoute {
  constructor(opts) {
    this.useMatch = (opts2) => {
      return useMatch({
        select: opts2?.select,
        from: this.options.id
      });
    };
    this.useRouteContext = (opts2) => {
      return useMatch({
        from: this.options.id,
        select: (d) => opts2?.select ? opts2.select(d.context) : d.context
      });
    };
    this.useSearch = (opts2) => {
      return useSearch({
        select: opts2?.select,
        from: this.options.id
      });
    };
    this.useParams = (opts2) => {
      return useParams({
        select: opts2?.select,
        from: this.options.id
      });
    };
    this.useLoaderDeps = (opts2) => {
      return useLoaderDeps({ ...opts2, from: this.options.id });
    };
    this.useLoaderData = (opts2) => {
      return useLoaderData({ ...opts2, from: this.options.id });
    };
    this.useNavigate = () => {
      const router2 = useRouter();
      return useNavigate({ from: router2.routesById[this.options.id].fullPath });
    };
    this.options = opts;
  }
}
function createLazyFileRoute(id) {
  if (typeof id === "object") {
    return new LazyRoute(id);
  }
  return (opts) => new LazyRoute({ id, ...opts });
}
function lazyRouteComponent(importer, exportName) {
  let loadPromise;
  let comp;
  let error;
  const load = () => {
    if (!loadPromise) {
      loadPromise = importer().then((res) => {
        loadPromise = void 0;
        comp = res[exportName];
        return comp;
      }).catch((err) => {
        error = err;
      });
    }
    return loadPromise;
  };
  const lazyComp = function Lazy(props) {
    if (error) {
      if (isModuleNotFoundError(error)) {
        if (error instanceof Error && typeof window !== "undefined" && typeof sessionStorage !== "undefined") {
          const storageKey = `tanstack_router_reload:${error.message}`;
          if (!sessionStorage.getItem(storageKey)) {
            sessionStorage.setItem(storageKey, "1");
            window.location.reload();
            return {
              default: () => null
            };
          }
        }
      }
      throw error;
    }
    if (!comp) {
      const [compResource] = createResource(load, {
        initialValue: comp,
        ssrLoadFrom: "initial"
      });
      return compResource();
    }
    return createComponent(Dynamic, mergeProps({
      component: comp
    }, props));
  };
  lazyComp.preload = load;
  return lazyComp;
}
const createRouter = (options) => {
  return new Router(options);
};
class Router extends RouterCore {
  constructor(options) {
    super(options);
  }
}
if (typeof globalThis !== "undefined") {
  globalThis.createFileRoute = createFileRoute;
  globalThis.createLazyFileRoute = createLazyFileRoute;
} else if (typeof window !== "undefined") {
  window.createFileRoute = createFileRoute;
  window.createLazyFileRoute = createLazyFileRoute;
}
var _tmpl$ = ["<aside", "><!--$-->", "<!--/--><span> | </span><!--$-->", "<!--/--><span> | </span><!--$-->", "<!--/--></aside>"], _tmpl$2 = ["<button", ' type="button">Dashboard Counter <!--$-->', "<!--/--></button>"];
const Route$4 = createRootRoute({
  head: () => ({
    meta: [{
      charSet: "utf-8"
    }, {
      name: "viewport",
      content: "width=device-width, initial-scale=1"
    }, {
      title: "TanStack Start Starter"
    }]
  }),
  component: RootComponent
});
function RootComponent() {
  return createComponent(RootDocument, {
    get children() {
      return createComponent(Outlet, {});
    }
  });
}
function RootDocument(props) {
  return [createComponent(HeadContent, {}), ssr(_tmpl$, ssrHydrationKey(), escape(createComponent(Link, {
    to: "/",
    children: "Home"
  })), escape(createComponent(Link, {
    to: "/dashboard",
    children: "Dashboard"
  })), escape(createComponent(Counter, {}))), props.children, createComponent(Scripts, {})];
}
function Counter() {
  const [count, setCount] = createSignal(0);
  return ssr(_tmpl$2, ssrHydrationKey(), escape(count()));
}
const $$splitComponentImporter$1 = () => import("./dashboard-BDiRsEIS.js");
const Route$3 = createFileRoute("/dashboard")({
  component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
const $$splitComponentImporter = () => import("./index-cuSYT2nh.js");
const Route$2 = createFileRoute("/")({
  component: lazyRouteComponent($$splitComponentImporter, "component")
});
const Route$1 = createFileRoute("/dashboard/")({});
const Route2 = createFileRoute("/dashboard/settings")({});
const DashboardRoute = Route$3.update({
  id: "/dashboard",
  path: "/dashboard",
  getParentRoute: () => Route$4
});
const IndexRoute = Route$2.update({
  id: "/",
  path: "/",
  getParentRoute: () => Route$4
});
const DashboardIndexRoute = Route$1.update({
  id: "/",
  path: "/",
  getParentRoute: () => DashboardRoute
});
const DashboardSettingsRoute = Route2.update({
  id: "/settings",
  path: "/settings",
  getParentRoute: () => DashboardRoute
});
const DashboardRouteChildren = {
  DashboardSettingsRoute,
  DashboardIndexRoute
};
const DashboardRouteWithChildren = DashboardRoute._addFileChildren(
  DashboardRouteChildren
);
const rootRouteChildren = {
  IndexRoute,
  DashboardRoute: DashboardRouteWithChildren
};
const routeTree = Route$4._addFileChildren(rootRouteChildren)._addFileTypes();
function getRouter() {
  const router2 = createRouter({
    routeTree,
    scrollRestoration: true
  });
  return router2;
}
const router = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  getRouter
}, Symbol.toStringTag, { value: "Module" }));
export {
  Link as L,
  router as r
};
