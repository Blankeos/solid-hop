import { AsyncLocalStorage } from "node:async_hooks";
import { ReadableStream as ReadableStream$1 } from "node:stream/web";
const ERROR = Symbol("error");
function castError(err) {
  if (err instanceof Error) return err;
  return new Error(typeof err === "string" ? err : "Unknown error", {
    cause: err
  });
}
function handleError(err, owner = Owner) {
  const fns = owner && owner.context && owner.context[ERROR];
  const error = castError(err);
  if (!fns) throw error;
  try {
    for (const f2 of fns) f2(error);
  } catch (e) {
    handleError(e, owner && owner.owner || null);
  }
}
const UNOWNED = {
  context: null,
  owner: null,
  owned: null,
  cleanups: null
};
let Owner = null;
function createOwner() {
  const o2 = {
    owner: Owner,
    context: Owner ? Owner.context : null,
    owned: null,
    cleanups: null
  };
  if (Owner) {
    if (!Owner.owned) Owner.owned = [o2];
    else Owner.owned.push(o2);
  }
  return o2;
}
function createRoot(fn, detachedOwner) {
  const owner = Owner, current = owner, root = fn.length === 0 ? UNOWNED : {
    context: current ? current.context : null,
    owner: current,
    owned: null,
    cleanups: null
  };
  Owner = root;
  let result;
  try {
    result = fn(fn.length === 0 ? () => {
    } : () => cleanNode(root));
  } catch (err) {
    handleError(err);
  } finally {
    Owner = owner;
  }
  return result;
}
function createSignal(value, options) {
  return [() => value, (v4) => {
    return value = typeof v4 === "function" ? v4(value) : v4;
  }];
}
function createComputed(fn, value) {
  Owner = createOwner();
  try {
    fn(value);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = Owner.owner;
  }
}
const createRenderEffect = createComputed;
function createEffect(fn, value) {
}
function createMemo(fn, value) {
  Owner = createOwner();
  let v4;
  try {
    v4 = fn(value);
  } catch (err) {
    handleError(err);
  } finally {
    Owner = Owner.owner;
  }
  return () => v4;
}
function batch$1(fn) {
  return fn();
}
const untrack = batch$1;
function on(deps, fn, options = {}) {
  const isArray = Array.isArray(deps);
  const defer = options.defer;
  return () => {
    if (defer) return void 0;
    let value;
    if (isArray) {
      value = [];
      for (let i2 = 0; i2 < deps.length; i2++) value.push(deps[i2]());
    } else value = deps();
    return fn(value);
  };
}
function onCleanup(fn) {
  if (Owner) {
    if (!Owner.cleanups) Owner.cleanups = [fn];
    else Owner.cleanups.push(fn);
  }
  return fn;
}
function cleanNode(node) {
  if (node.owned) {
    for (let i2 = 0; i2 < node.owned.length; i2++) cleanNode(node.owned[i2]);
    node.owned = null;
  }
  if (node.cleanups) {
    for (let i2 = 0; i2 < node.cleanups.length; i2++) node.cleanups[i2]();
    node.cleanups = null;
  }
}
function catchError(fn, handler) {
  const owner = createOwner();
  owner.context = {
    ...owner.context,
    [ERROR]: [handler]
  };
  Owner = owner;
  try {
    return fn();
  } catch (err) {
    handleError(err);
  } finally {
    Owner = Owner.owner;
  }
}
function createContext(defaultValue) {
  const id = Symbol("context");
  return {
    id,
    Provider: createProvider(id),
    defaultValue
  };
}
function useContext(context) {
  return Owner && Owner.context && Owner.context[context.id] !== void 0 ? Owner.context[context.id] : context.defaultValue;
}
function children(fn) {
  const memo = createMemo(() => resolveChildren(fn()));
  memo.toArray = () => {
    const c2 = memo();
    return Array.isArray(c2) ? c2 : c2 != null ? [c2] : [];
  };
  return memo;
}
function runWithOwner(o2, fn) {
  const prev = Owner;
  Owner = o2;
  try {
    return fn();
  } catch (err) {
    handleError(err);
  } finally {
    Owner = prev;
  }
}
function resolveChildren(children2) {
  if (typeof children2 === "function" && !children2.length) return resolveChildren(children2());
  if (Array.isArray(children2)) {
    const results = [];
    for (let i2 = 0; i2 < children2.length; i2++) {
      const result = resolveChildren(children2[i2]);
      Array.isArray(result) ? results.push.apply(results, result) : results.push(result);
    }
    return results;
  }
  return children2;
}
function createProvider(id) {
  return function provider(props) {
    return createMemo(() => {
      Owner.context = {
        ...Owner.context,
        [id]: props.value
      };
      return children(() => props.children);
    });
  };
}
function escape$1(s3, attr) {
  const t = typeof s3;
  if (t !== "string") {
    if (t === "function") return escape$1(s3());
    if (Array.isArray(s3)) {
      for (let i2 = 0; i2 < s3.length; i2++) s3[i2] = escape$1(s3[i2]);
      return s3;
    }
    return s3;
  }
  const delim = "<";
  const escDelim = "&lt;";
  let iDelim = s3.indexOf(delim);
  let iAmp = s3.indexOf("&");
  if (iDelim < 0 && iAmp < 0) return s3;
  let left = 0, out = "";
  while (iDelim >= 0 && iAmp >= 0) {
    if (iDelim < iAmp) {
      if (left < iDelim) out += s3.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s3.indexOf(delim, left);
    } else {
      if (left < iAmp) out += s3.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s3.indexOf("&", left);
    }
  }
  if (iDelim >= 0) {
    do {
      if (left < iDelim) out += s3.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s3.indexOf(delim, left);
    } while (iDelim >= 0);
  } else while (iAmp >= 0) {
    if (left < iAmp) out += s3.substring(left, iAmp);
    out += "&amp;";
    left = iAmp + 1;
    iAmp = s3.indexOf("&", left);
  }
  return left < s3.length ? out + s3.substring(left) : out;
}
function resolveSSRNode$1(node) {
  const t = typeof node;
  if (t === "string") return node;
  if (node == null || t === "boolean") return "";
  if (Array.isArray(node)) {
    let prev = {};
    let mapped = "";
    for (let i2 = 0, len = node.length; i2 < len; i2++) {
      if (typeof prev !== "object" && typeof node[i2] !== "object") mapped += `<!--!$-->`;
      mapped += resolveSSRNode$1(prev = node[i2]);
    }
    return mapped;
  }
  if (t === "object") return node.t;
  if (t === "function") return resolveSSRNode$1(node());
  return String(node);
}
const sharedConfig = {
  context: void 0,
  getContextId() {
    if (!this.context) throw new Error(`getContextId cannot be used under non-hydrating context`);
    return getContextId(this.context.count);
  },
  getNextContextId() {
    if (!this.context) throw new Error(`getNextContextId cannot be used under non-hydrating context`);
    return getContextId(this.context.count++);
  }
};
function getContextId(count) {
  const num = String(count), len = num.length - 1;
  return sharedConfig.context.id + (len ? String.fromCharCode(96 + len) : "") + num;
}
function setHydrateContext(context) {
  sharedConfig.context = context;
}
function nextHydrateContext() {
  return sharedConfig.context ? {
    ...sharedConfig.context,
    id: sharedConfig.getNextContextId(),
    count: 0
  } : void 0;
}
function createUniqueId() {
  return sharedConfig.getNextContextId();
}
function createComponent(Comp, props) {
  if (sharedConfig.context && !sharedConfig.context.noHydrate) {
    const c2 = sharedConfig.context;
    setHydrateContext(nextHydrateContext());
    const r = Comp(props || {});
    setHydrateContext(c2);
    return r;
  }
  return Comp(props || {});
}
function mergeProps(...sources) {
  const target = {};
  for (let i2 = 0; i2 < sources.length; i2++) {
    let source = sources[i2];
    if (typeof source === "function") source = source();
    if (source) {
      const descriptors = Object.getOwnPropertyDescriptors(source);
      for (const key in descriptors) {
        if (key in target) continue;
        Object.defineProperty(target, key, {
          enumerable: true,
          get() {
            for (let i3 = sources.length - 1; i3 >= 0; i3--) {
              let v4, s3 = sources[i3];
              if (typeof s3 === "function") s3 = s3();
              v4 = (s3 || {})[key];
              if (v4 !== void 0) return v4;
            }
          }
        });
      }
    }
  }
  return target;
}
function splitProps(props, ...keys) {
  const descriptors = Object.getOwnPropertyDescriptors(props), split = (k2) => {
    const clone = {};
    for (let i2 = 0; i2 < k2.length; i2++) {
      const key = k2[i2];
      if (descriptors[key]) {
        Object.defineProperty(clone, key, descriptors[key]);
        delete descriptors[key];
      }
    }
    return clone;
  };
  return keys.map(split).concat(split(Object.keys(descriptors)));
}
function Show(props) {
  let c2;
  return props.when ? typeof (c2 = props.children) === "function" ? c2(props.keyed ? props.when : () => props.when) : c2 : props.fallback || "";
}
function Switch(props) {
  let conditions = props.children;
  Array.isArray(conditions) || (conditions = [conditions]);
  for (let i2 = 0; i2 < conditions.length; i2++) {
    const w2 = conditions[i2].when;
    if (w2) {
      const c2 = conditions[i2].children;
      return typeof c2 === "function" ? c2(conditions[i2].keyed ? w2 : () => w2) : c2;
    }
  }
  return props.fallback || "";
}
function Match$1(props) {
  return props;
}
function ErrorBoundary(props) {
  let error, res, clean, sync = true;
  const ctx = sharedConfig.context;
  const id = sharedConfig.getContextId();
  function displayFallback() {
    cleanNode(clean);
    ctx.serialize(id, error);
    setHydrateContext({
      ...ctx,
      count: 0
    });
    const f2 = props.fallback;
    return typeof f2 === "function" && f2.length ? f2(error, () => {
    }) : f2;
  }
  createMemo(() => {
    clean = Owner;
    return catchError(() => res = props.children, (err) => {
      error = err;
      !sync && ctx.replace("e" + id, displayFallback);
      sync = true;
    });
  });
  if (error) return displayFallback();
  sync = false;
  return {
    t: `<!--!$e${id}-->${resolveSSRNode$1(escape$1(res))}<!--!$/e${id}-->`
  };
}
const SuspenseContext = createContext();
let resourceContext = null;
function createResource(source, fetcher, options = {}) {
  if (typeof fetcher !== "function") {
    options = fetcher || {};
    fetcher = source;
    source = true;
  }
  const contexts = /* @__PURE__ */ new Set();
  const id = sharedConfig.getNextContextId();
  let resource = {};
  let value = options.storage ? options.storage(options.initialValue)[0]() : options.initialValue;
  let p2;
  let error;
  if (sharedConfig.context.async && options.ssrLoadFrom !== "initial") {
    resource = sharedConfig.context.resources[id] || (sharedConfig.context.resources[id] = {});
    if (resource.ref) {
      if (!resource.data && !resource.ref[0].loading && !resource.ref[0].error) resource.ref[1].refetch();
      return resource.ref;
    }
  }
  const read = () => {
    if (error) throw error;
    const resolved = options.ssrLoadFrom !== "initial" && sharedConfig.context.async && "data" in sharedConfig.context.resources[id];
    if (!resolved && resourceContext) resourceContext.push(id);
    if (!resolved && read.loading) {
      const ctx = useContext(SuspenseContext);
      if (ctx) {
        ctx.resources.set(id, read);
        contexts.add(ctx);
      }
    }
    return resolved ? sharedConfig.context.resources[id].data : value;
  };
  read.loading = false;
  read.error = void 0;
  read.state = "initialValue" in options ? "ready" : "unresolved";
  Object.defineProperty(read, "latest", {
    get() {
      return read();
    }
  });
  function load() {
    const ctx = sharedConfig.context;
    if (!ctx.async) return read.loading = !!(typeof source === "function" ? source() : source);
    if (ctx.resources && id in ctx.resources && "data" in ctx.resources[id]) {
      value = ctx.resources[id].data;
      return;
    }
    let lookup;
    try {
      resourceContext = [];
      lookup = typeof source === "function" ? source() : source;
      if (resourceContext.length) return;
    } finally {
      resourceContext = null;
    }
    if (!p2) {
      if (lookup == null || lookup === false) return;
      p2 = fetcher(lookup, {
        value
      });
    }
    if (p2 != void 0 && typeof p2 === "object" && "then" in p2) {
      read.loading = true;
      read.state = "pending";
      p2 = p2.then((res) => {
        read.loading = false;
        read.state = "ready";
        ctx.resources[id].data = res;
        p2 = null;
        notifySuspense(contexts);
        return res;
      }).catch((err) => {
        read.loading = false;
        read.state = "errored";
        read.error = error = castError(err);
        p2 = null;
        notifySuspense(contexts);
        throw error;
      });
      if (ctx.serialize) ctx.serialize(id, p2, options.deferStream);
      return p2;
    }
    ctx.resources[id].data = p2;
    if (ctx.serialize) ctx.serialize(id, p2);
    p2 = null;
    return ctx.resources[id].data;
  }
  if (options.ssrLoadFrom !== "initial") load();
  const ref = [read, {
    refetch: load,
    mutate: (v4) => value = v4
  }];
  if (p2) resource.ref = ref;
  return ref;
}
function suspenseComplete(c2) {
  for (const r of c2.resources.values()) {
    if (r.loading) return false;
  }
  return true;
}
function notifySuspense(contexts) {
  for (const c2 of contexts) {
    if (!suspenseComplete(c2)) {
      continue;
    }
    c2.completed();
    contexts.delete(c2);
  }
}
function Suspense(props) {
  let done;
  const ctx = sharedConfig.context;
  const id = sharedConfig.getContextId();
  const o2 = createOwner();
  const value = ctx.suspense[id] || (ctx.suspense[id] = {
    resources: /* @__PURE__ */ new Map(),
    completed: () => {
      const res2 = runSuspense();
      if (suspenseComplete(value)) {
        done(resolveSSRNode$1(escape$1(res2)));
      }
    }
  });
  function suspenseError(err) {
    if (!done || !done(void 0, err)) {
      runWithOwner(o2.owner, () => {
        throw err;
      });
    }
  }
  function runSuspense() {
    setHydrateContext({
      ...ctx,
      count: 0
    });
    cleanNode(o2);
    return runWithOwner(o2, () => createComponent(SuspenseContext.Provider, {
      value,
      get children() {
        return catchError(() => props.children, suspenseError);
      }
    }));
  }
  const res = runSuspense();
  if (suspenseComplete(value)) {
    delete ctx.suspense[id];
    return res;
  }
  done = ctx.async ? ctx.registerFragment(id) : void 0;
  return catchError(() => {
    if (ctx.async) {
      setHydrateContext({
        ...ctx,
        count: 0,
        id: ctx.id + "0F",
        noHydrate: true
      });
      const res2 = {
        t: `<template id="pl-${id}"></template>${resolveSSRNode$1(escape$1(props.fallback))}<!--pl-${id}-->`
      };
      setHydrateContext(ctx);
      return res2;
    }
    setHydrateContext({
      ...ctx,
      count: 0,
      id: ctx.id + "0F"
    });
    ctx.serialize(id, "$$f");
    return props.fallback;
  }, suspenseError);
}
var R$2 = ((a) => (a[a.AggregateError = 1] = "AggregateError", a[a.ArrowFunction = 2] = "ArrowFunction", a[a.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", a[a.ObjectAssign = 8] = "ObjectAssign", a[a.BigIntTypedArray = 16] = "BigIntTypedArray", a))(R$2 || {});
function Nr$2(o2) {
  switch (o2) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return;
  }
}
function d$2(o2) {
  let e = "", r = 0, t;
  for (let n = 0, a = o2.length; n < a; n++) t = Nr$2(o2[n]), t && (e += o2.slice(r, n) + t, r = n + 1);
  return r === 0 ? e = o2 : e += o2.slice(r), e;
}
var T$3 = "__SEROVAL_REFS__", Q$1 = "$R", ae$1 = `self.${Q$1}`;
function xr$1(o2) {
  return o2 == null ? `${ae$1}=${ae$1}||[]` : `(${ae$1}=${ae$1}||{})["${d$2(o2)}"]=[]`;
}
function f$3(o2, e) {
  if (!o2) throw e;
}
var Be$2 = /* @__PURE__ */ new Map(), O$2 = /* @__PURE__ */ new Map();
function je$2(o2) {
  return Be$2.has(o2);
}
function Ke$2(o2) {
  return f$3(je$2(o2), new ie$3(o2)), Be$2.get(o2);
}
typeof globalThis != "undefined" ? Object.defineProperty(globalThis, T$3, { value: O$2, configurable: true, writable: false, enumerable: false }) : typeof self != "undefined" ? Object.defineProperty(self, T$3, { value: O$2, configurable: true, writable: false, enumerable: false }) : typeof global != "undefined" && Object.defineProperty(global, T$3, { value: O$2, configurable: true, writable: false, enumerable: false });
function Hr$1(o2) {
  return o2;
}
function Ye$2(o2, e) {
  for (let r = 0, t = e.length; r < t; r++) {
    let n = e[r];
    o2.has(n) || (o2.add(n), n.extends && Ye$2(o2, n.extends));
  }
}
function m$3(o2) {
  if (o2) {
    let e = /* @__PURE__ */ new Set();
    return Ye$2(e, o2), [...e];
  }
}
var $e$1 = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, ce$2 = { [Symbol.asyncIterator]: 0, [Symbol.hasInstance]: 1, [Symbol.isConcatSpreadable]: 2, [Symbol.iterator]: 3, [Symbol.match]: 4, [Symbol.matchAll]: 5, [Symbol.replace]: 6, [Symbol.search]: 7, [Symbol.species]: 8, [Symbol.split]: 9, [Symbol.toPrimitive]: 10, [Symbol.toStringTag]: 11, [Symbol.unscopables]: 12 }, qe$1 = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" };
var ue$3 = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, s$3 = void 0;
function u$4(o2, e, r, t, n, a, i2, l2, c2, p2, h2, X2) {
  return { t: o2, i: e, s: r, l: t, c: n, m: a, p: i2, e: l2, a: c2, f: p2, b: h2, o: X2 };
}
function x$2(o2) {
  return u$4(2, s$3, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
var I$3 = x$2(2), A$3 = x$2(3), pe$3 = x$2(1), de$2 = x$2(0), Xe$2 = x$2(4), Qe$2 = x$2(5), er$2 = x$2(6), rr$2 = x$2(7);
function me$3(o2) {
  return o2 instanceof EvalError ? 1 : o2 instanceof RangeError ? 2 : o2 instanceof ReferenceError ? 3 : o2 instanceof SyntaxError ? 4 : o2 instanceof TypeError ? 5 : o2 instanceof URIError ? 6 : 0;
}
function wr$2(o2) {
  let e = ue$3[me$3(o2)];
  return o2.name !== e ? { name: o2.name } : o2.constructor.name !== e ? { name: o2.constructor.name } : {};
}
function j$3(o2, e) {
  let r = wr$2(o2), t = Object.getOwnPropertyNames(o2);
  for (let n = 0, a = t.length, i2; n < a; n++) i2 = t[n], i2 !== "name" && i2 !== "message" && (i2 === "stack" ? e & 4 && (r = r || {}, r[i2] = o2[i2]) : (r = r || {}, r[i2] = o2[i2]));
  return r;
}
function fe$3(o2) {
  return Object.isFrozen(o2) ? 3 : Object.isSealed(o2) ? 2 : Object.isExtensible(o2) ? 0 : 1;
}
function ge$2(o2) {
  switch (o2) {
    case Number.POSITIVE_INFINITY:
      return Qe$2;
    case Number.NEGATIVE_INFINITY:
      return er$2;
  }
  return o2 !== o2 ? rr$2 : Object.is(o2, -0) ? Xe$2 : u$4(0, s$3, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function w$3(o2) {
  return u$4(1, s$3, d$2(o2), s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function Se$2(o2) {
  return u$4(3, s$3, "" + o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function sr$2(o2) {
  return u$4(4, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function he$2(o2, e) {
  let r = e.valueOf();
  return u$4(5, o2, r !== r ? "" : e.toISOString(), s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function ye$2(o2, e) {
  return u$4(6, o2, s$3, s$3, d$2(e.source), e.flags, s$3, s$3, s$3, s$3, s$3, s$3);
}
function ve$2(o2, e) {
  let r = new Uint8Array(e), t = r.length, n = new Array(t);
  for (let a = 0; a < t; a++) n[a] = r[a];
  return u$4(19, o2, n, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function or$2(o2, e) {
  return u$4(17, o2, ce$2[e], s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function nr$2(o2, e) {
  return u$4(18, o2, d$2(Ke$2(e)), s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function _$3(o2, e, r) {
  return u$4(25, o2, r, s$3, d$2(e), s$3, s$3, s$3, s$3, s$3, s$3, s$3);
}
function Ne$2(o2, e, r) {
  return u$4(9, o2, s$3, e.length, s$3, s$3, s$3, s$3, r, s$3, s$3, fe$3(e));
}
function be$2(o2, e) {
  return u$4(21, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, e, s$3, s$3);
}
function xe$2(o2, e, r) {
  return u$4(15, o2, s$3, e.length, e.constructor.name, s$3, s$3, s$3, s$3, r, e.byteOffset, s$3);
}
function Ie$2(o2, e, r) {
  return u$4(16, o2, s$3, e.length, e.constructor.name, s$3, s$3, s$3, s$3, r, e.byteOffset, s$3);
}
function Ae$2(o2, e, r) {
  return u$4(20, o2, s$3, e.byteLength, s$3, s$3, s$3, s$3, s$3, r, e.byteOffset, s$3);
}
function we$2(o2, e, r) {
  return u$4(13, o2, me$3(e), s$3, s$3, d$2(e.message), r, s$3, s$3, s$3, s$3, s$3);
}
function Ee$2(o2, e, r) {
  return u$4(14, o2, me$3(e), s$3, s$3, d$2(e.message), r, s$3, s$3, s$3, s$3, s$3);
}
function Pe$2(o2, e, r) {
  return u$4(7, o2, s$3, e, s$3, s$3, s$3, s$3, r, s$3, s$3, s$3);
}
function M$2(o2, e) {
  return u$4(28, s$3, s$3, s$3, s$3, s$3, s$3, s$3, [o2, e], s$3, s$3, s$3);
}
function U$2(o2, e) {
  return u$4(30, s$3, s$3, s$3, s$3, s$3, s$3, s$3, [o2, e], s$3, s$3, s$3);
}
function L$2(o2, e, r) {
  return u$4(31, o2, s$3, s$3, s$3, s$3, s$3, s$3, r, e, s$3, s$3);
}
function Re$2(o2, e) {
  return u$4(32, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, e, s$3, s$3);
}
function Te$1(o2, e) {
  return u$4(33, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, e, s$3, s$3);
}
function Oe$2(o2, e) {
  return u$4(34, o2, s$3, s$3, s$3, s$3, s$3, s$3, s$3, e, s$3, s$3);
}
var { toString: _e$2 } = Object.prototype;
function Er$2(o2, e) {
  return e instanceof Error ? `Seroval caught an error during the ${o2} process.
  
${e.name}
${e.message}

- For more information, please check the "cause" property of this error.
- If you believe this is an error in Seroval, please submit an issue at https://github.com/lxsmnsyc/seroval/issues/new` : `Seroval caught an error during the ${o2} process.

"${_e$2.call(e)}"

For more information, please check the "cause" property of this error.`;
}
var ee$4 = class ee extends Error {
  constructor(r, t) {
    super(Er$2(r, t));
    this.cause = t;
  }
}, E$3 = class E extends ee$4 {
  constructor(e) {
    super("parsing", e);
  }
}, Ce$2 = class Ce extends ee$4 {
  constructor(e) {
    super("serialization", e);
  }
}, g$3 = class g extends Error {
  constructor(r) {
    super(`The value ${_e$2.call(r)} of type "${typeof r}" cannot be parsed/serialized.
      
There are few workarounds for this problem:
- Transform the value in a way that it can be serialized.
- If the reference is present on multiple runtimes (isomorphic), you can use the Reference API to map the references.`);
    this.value = r;
  }
}, y$3 = class y extends Error {
  constructor(e) {
    super('Unsupported node type "' + e.t + '".');
  }
}, W$3 = class W extends Error {
  constructor(e) {
    super('Missing plugin for tag "' + e + '".');
  }
}, ie$3 = class ie extends Error {
  constructor(r) {
    super('Missing reference for the value "' + _e$2.call(r) + '" of type "' + typeof r + '"');
    this.value = r;
  }
};
var C$3 = class C {
  constructor(e, r) {
    this.value = e;
    this.replacement = r;
  }
};
function z$2(o2, e, r) {
  return o2 & 2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (r.startsWith("{") ? "(" + r + ")" : r) : "function(" + e.join(",") + "){return " + r + "}";
}
function S$1(o2, e, r) {
  return o2 & 2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + r + "}" : "function(" + e.join(",") + "){" + r + "}";
}
var ar$2 = {}, ir$2 = {};
var lr$2 = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} };
function Pr$1(o2) {
  return z$2(o2, ["r"], "(r.p=new Promise(" + S$1(o2, ["s", "f"], "r.s=s,r.f=f") + "))");
}
function Rr$1(o2) {
  return S$1(o2, ["r", "d"], "r.s(d),r.p.s=1,r.p.v=d");
}
function Tr(o2) {
  return S$1(o2, ["r", "d"], "r.f(d),r.p.s=2,r.p.v=d");
}
function Or$1(o2) {
  return z$2(o2, ["b", "a", "s", "l", "p", "f", "e", "n"], "(b=[],a=!0,s=!1,l=[],p=0,f=" + S$1(o2, ["v", "m", "x"], "for(x=0;x<p;x++)l[x]&&l[x][m](v)") + ",n=" + S$1(o2, ["o", "x", "z", "c"], 'for(x=0,z=b.length;x<z;x++)(c=b[x],(!a&&x===z-1)?o[s?"return":"throw"](c):o.next(c))') + ",e=" + z$2(o2, ["o", "t"], "(a&&(l[t=p++]=o),n(o)," + S$1(o2, [], "a&&(l[t]=void 0)") + ")") + ",{__SEROVAL_STREAM__:!0,on:" + z$2(o2, ["o"], "e(o)") + ",next:" + S$1(o2, ["v"], 'a&&(b.push(v),f(v,"next"))') + ",throw:" + S$1(o2, ["v"], 'a&&(b.push(v),f(v,"throw"),a=s=!1,l.length=0)') + ",return:" + S$1(o2, ["v"], 'a&&(b.push(v),f(v,"return"),a=!1,s=!0,l.length=0)') + "})");
}
function cr$1(o2, e) {
  switch (e) {
    case 0:
      return "[]";
    case 1:
      return Pr$1(o2);
    case 2:
      return Rr$1(o2);
    case 3:
      return Tr(o2);
    case 4:
      return Or$1(o2);
    default:
      return "";
  }
}
function Fe$2(o2) {
  return "__SEROVAL_STREAM__" in o2;
}
function K$3() {
  let o2 = /* @__PURE__ */ new Set(), e = [], r = true, t = true;
  function n(l2) {
    for (let c2 of o2.keys()) c2.next(l2);
  }
  function a(l2) {
    for (let c2 of o2.keys()) c2.throw(l2);
  }
  function i2(l2) {
    for (let c2 of o2.keys()) c2.return(l2);
  }
  return { __SEROVAL_STREAM__: true, on(l2) {
    r && o2.add(l2);
    for (let c2 = 0, p2 = e.length; c2 < p2; c2++) {
      let h2 = e[c2];
      c2 === p2 - 1 && !r ? t ? l2.return(h2) : l2.throw(h2) : l2.next(h2);
    }
    return () => {
      r && o2.delete(l2);
    };
  }, next(l2) {
    r && (e.push(l2), n(l2));
  }, throw(l2) {
    r && (e.push(l2), a(l2), r = false, t = false, o2.clear());
  }, return(l2) {
    r && (e.push(l2), i2(l2), r = false, t = true, o2.clear());
  } };
}
function Ve$2(o2) {
  let e = K$3(), r = o2[Symbol.asyncIterator]();
  async function t() {
    try {
      let n = await r.next();
      n.done ? e.return(n.value) : (e.next(n.value), await t());
    } catch (n) {
      e.throw(n);
    }
  }
  return t().catch(() => {
  }), e;
}
function J$3(o2) {
  let e = [], r = -1, t = -1, n = o2[Symbol.iterator]();
  for (; ; ) try {
    let a = n.next();
    if (e.push(a.value), a.done) {
      t = e.length - 1;
      break;
    }
  } catch (a) {
    r = e.length, e.push(a);
  }
  return { v: e, t: r, d: t };
}
var Y$3 = class Y {
  constructor(e) {
    this.marked = /* @__PURE__ */ new Set();
    this.plugins = e.plugins, this.features = 31 ^ (e.disabledFeatures || 0), this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  createIndex(e) {
    let r = this.refs.size;
    return this.refs.set(e, r), r;
  }
  getIndexedValue(e) {
    let r = this.refs.get(e);
    return r != null ? (this.markRef(r), { type: 1, value: sr$2(r) }) : { type: 0, value: this.createIndex(e) };
  }
  getReference(e) {
    let r = this.getIndexedValue(e);
    return r.type === 1 ? r : je$2(e) ? { type: 2, value: nr$2(r.value, e) } : r;
  }
  parseWellKnownSymbol(e) {
    let r = this.getReference(e);
    return r.type !== 0 ? r.value : (f$3(e in ce$2, new g$3(e)), or$2(r.value, e));
  }
  parseSpecialReference(e) {
    let r = this.getIndexedValue(lr$2[e]);
    return r.type === 1 ? r.value : u$4(26, r.value, e, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3, s$3);
  }
  parseIteratorFactory() {
    let e = this.getIndexedValue(ar$2);
    return e.type === 1 ? e.value : u$4(27, e.value, s$3, s$3, s$3, s$3, s$3, s$3, s$3, this.parseWellKnownSymbol(Symbol.iterator), s$3, s$3);
  }
  parseAsyncIteratorFactory() {
    let e = this.getIndexedValue(ir$2);
    return e.type === 1 ? e.value : u$4(29, e.value, s$3, s$3, s$3, s$3, s$3, s$3, [this.parseSpecialReference(1), this.parseWellKnownSymbol(Symbol.asyncIterator)], s$3, s$3, s$3);
  }
  createObjectNode(e, r, t, n) {
    return u$4(t ? 11 : 10, e, s$3, s$3, s$3, s$3, n, s$3, s$3, s$3, s$3, fe$3(r));
  }
  createMapNode(e, r, t, n) {
    return u$4(8, e, s$3, s$3, s$3, s$3, s$3, { k: r, v: t, s: n }, s$3, this.parseSpecialReference(0), s$3, s$3);
  }
  createPromiseConstructorNode(e, r) {
    return u$4(22, e, r, s$3, s$3, s$3, s$3, s$3, s$3, this.parseSpecialReference(1), s$3, s$3);
  }
};
var kr$1 = /^[$A-Z_][0-9A-Z_$]*$/i;
function Le$1(o2) {
  let e = o2[0];
  return (e === "$" || e === "_" || e >= "A" && e <= "Z" || e >= "a" && e <= "z") && kr$1.test(o2);
}
function se$2(o2) {
  switch (o2.t) {
    case 0:
      return o2.s + "=" + o2.v;
    case 2:
      return o2.s + ".set(" + o2.k + "," + o2.v + ")";
    case 1:
      return o2.s + ".add(" + o2.v + ")";
    case 3:
      return o2.s + ".delete(" + o2.k + ")";
  }
}
function Fr$1(o2) {
  let e = [], r = o2[0];
  for (let t = 1, n = o2.length, a, i2 = r; t < n; t++) a = o2[t], a.t === 0 && a.v === i2.v ? r = { t: 0, s: a.s, k: s$3, v: se$2(r) } : a.t === 2 && a.s === i2.s ? r = { t: 2, s: se$2(r), k: a.k, v: a.v } : a.t === 1 && a.s === i2.s ? r = { t: 1, s: se$2(r), k: s$3, v: a.v } : a.t === 3 && a.s === i2.s ? r = { t: 3, s: se$2(r), k: a.k, v: s$3 } : (e.push(r), r = a), i2 = a;
  return e.push(r), e;
}
function fr$1(o2) {
  if (o2.length) {
    let e = "", r = Fr$1(o2);
    for (let t = 0, n = r.length; t < n; t++) e += se$2(r[t]) + ",";
    return e;
  }
  return s$3;
}
var Vr$1 = "Object.create(null)", Dr$1 = "new Set", Br$1 = "new Map", jr$1 = "Promise.resolve", _r$1 = "Promise.reject", Mr$1 = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: s$3 }, V$1 = class V {
  constructor(e) {
    this.stack = [];
    this.flags = [];
    this.assignments = [];
    this.plugins = e.plugins, this.features = e.features, this.marked = new Set(e.markedRefs);
  }
  createFunction(e, r) {
    return z$2(this.features, e, r);
  }
  createEffectfulFunction(e, r) {
    return S$1(this.features, e, r);
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  pushObjectFlag(e, r) {
    e !== 0 && (this.markRef(r), this.flags.push({ type: e, value: this.getRefParam(r) }));
  }
  resolveFlags() {
    let e = "";
    for (let r = 0, t = this.flags, n = t.length; r < n; r++) {
      let a = t[r];
      e += Mr$1[a.type] + "(" + a.value + "),";
    }
    return e;
  }
  resolvePatches() {
    let e = fr$1(this.assignments), r = this.resolveFlags();
    return e ? r ? e + r : e : r;
  }
  createAssignment(e, r) {
    this.assignments.push({ t: 0, s: e, k: s$3, v: r });
  }
  createAddAssignment(e, r) {
    this.assignments.push({ t: 1, s: this.getRefParam(e), k: s$3, v: r });
  }
  createSetAssignment(e, r, t) {
    this.assignments.push({ t: 2, s: this.getRefParam(e), k: r, v: t });
  }
  createDeleteAssignment(e, r) {
    this.assignments.push({ t: 3, s: this.getRefParam(e), k: r, v: s$3 });
  }
  createArrayAssign(e, r, t) {
    this.createAssignment(this.getRefParam(e) + "[" + r + "]", t);
  }
  createObjectAssign(e, r, t) {
    this.createAssignment(this.getRefParam(e) + "." + r, t);
  }
  isIndexedValueInStack(e) {
    return e.t === 4 && this.stack.includes(e.i);
  }
  serializeReference(e) {
    return this.assignIndexedValue(e.i, T$3 + '.get("' + e.s + '")');
  }
  serializeArrayItem(e, r, t) {
    return r ? this.isIndexedValueInStack(r) ? (this.markRef(e), this.createArrayAssign(e, t, this.getRefParam(r.i)), "") : this.serialize(r) : "";
  }
  serializeArray(e) {
    let r = e.i;
    if (e.l) {
      this.stack.push(r);
      let t = e.a, n = this.serializeArrayItem(r, t[0], 0), a = n === "";
      for (let i2 = 1, l2 = e.l, c2; i2 < l2; i2++) c2 = this.serializeArrayItem(r, t[i2], i2), n += "," + c2, a = c2 === "";
      return this.stack.pop(), this.pushObjectFlag(e.o, e.i), this.assignIndexedValue(r, "[" + n + (a ? ",]" : "]"));
    }
    return this.assignIndexedValue(r, "[]");
  }
  serializeProperty(e, r, t) {
    if (typeof r == "string") {
      let n = Number(r), a = n >= 0 && n.toString() === r || Le$1(r);
      if (this.isIndexedValueInStack(t)) {
        let i2 = this.getRefParam(t.i);
        return this.markRef(e.i), a && n !== n ? this.createObjectAssign(e.i, r, i2) : this.createArrayAssign(e.i, a ? r : '"' + r + '"', i2), "";
      }
      return (a ? r : '"' + r + '"') + ":" + this.serialize(t);
    }
    return "[" + this.serialize(r) + "]:" + this.serialize(t);
  }
  serializeProperties(e, r) {
    let t = r.s;
    if (t) {
      let n = r.k, a = r.v;
      this.stack.push(e.i);
      let i2 = this.serializeProperty(e, n[0], a[0]);
      for (let l2 = 1, c2 = i2; l2 < t; l2++) c2 = this.serializeProperty(e, n[l2], a[l2]), i2 += (c2 && i2 && ",") + c2;
      return this.stack.pop(), "{" + i2 + "}";
    }
    return "{}";
  }
  serializeObject(e) {
    return this.pushObjectFlag(e.o, e.i), this.assignIndexedValue(e.i, this.serializeProperties(e, e.p));
  }
  serializeWithObjectAssign(e, r, t) {
    let n = this.serializeProperties(e, r);
    return n !== "{}" ? "Object.assign(" + t + "," + n + ")" : t;
  }
  serializeStringKeyAssignment(e, r, t, n) {
    let a = this.serialize(n), i2 = Number(t), l2 = i2 >= 0 && i2.toString() === t || Le$1(t);
    if (this.isIndexedValueInStack(n)) l2 && i2 !== i2 ? this.createObjectAssign(e.i, t, a) : this.createArrayAssign(e.i, l2 ? t : '"' + t + '"', a);
    else {
      let c2 = this.assignments;
      this.assignments = r, l2 && i2 !== i2 ? this.createObjectAssign(e.i, t, a) : this.createArrayAssign(e.i, l2 ? t : '"' + t + '"', a), this.assignments = c2;
    }
  }
  serializeAssignment(e, r, t, n) {
    if (typeof t == "string") this.serializeStringKeyAssignment(e, r, t, n);
    else {
      let a = this.stack;
      this.stack = [];
      let i2 = this.serialize(n);
      this.stack = a;
      let l2 = this.assignments;
      this.assignments = r, this.createArrayAssign(e.i, this.serialize(t), i2), this.assignments = l2;
    }
  }
  serializeAssignments(e, r) {
    let t = r.s;
    if (t) {
      let n = [], a = r.k, i2 = r.v;
      this.stack.push(e.i);
      for (let l2 = 0; l2 < t; l2++) this.serializeAssignment(e, n, a[l2], i2[l2]);
      return this.stack.pop(), fr$1(n);
    }
    return s$3;
  }
  serializeDictionary(e, r) {
    if (e.p) if (this.features & 8) r = this.serializeWithObjectAssign(e, e.p, r);
    else {
      this.markRef(e.i);
      let t = this.serializeAssignments(e, e.p);
      if (t) return "(" + this.assignIndexedValue(e.i, r) + "," + t + this.getRefParam(e.i) + ")";
    }
    return this.assignIndexedValue(e.i, r);
  }
  serializeNullConstructor(e) {
    return this.pushObjectFlag(e.o, e.i), this.serializeDictionary(e, Vr$1);
  }
  serializeDate(e) {
    return this.assignIndexedValue(e.i, 'new Date("' + e.s + '")');
  }
  serializeRegExp(e) {
    return this.assignIndexedValue(e.i, "/" + e.c + "/" + e.m);
  }
  serializeSetItem(e, r) {
    return this.isIndexedValueInStack(r) ? (this.markRef(e), this.createAddAssignment(e, this.getRefParam(r.i)), "") : this.serialize(r);
  }
  serializeSet(e) {
    let r = Dr$1, t = e.l, n = e.i;
    if (t) {
      let a = e.a;
      this.stack.push(n);
      let i2 = this.serializeSetItem(n, a[0]);
      for (let l2 = 1, c2 = i2; l2 < t; l2++) c2 = this.serializeSetItem(n, a[l2]), i2 += (c2 && i2 && ",") + c2;
      this.stack.pop(), i2 && (r += "([" + i2 + "])");
    }
    return this.assignIndexedValue(n, r);
  }
  serializeMapEntry(e, r, t, n) {
    if (this.isIndexedValueInStack(r)) {
      let a = this.getRefParam(r.i);
      if (this.markRef(e), this.isIndexedValueInStack(t)) {
        let l2 = this.getRefParam(t.i);
        return this.createSetAssignment(e, a, l2), "";
      }
      if (t.t !== 4 && t.i != null && this.isMarked(t.i)) {
        let l2 = "(" + this.serialize(t) + ",[" + n + "," + n + "])";
        return this.createSetAssignment(e, a, this.getRefParam(t.i)), this.createDeleteAssignment(e, n), l2;
      }
      let i2 = this.stack;
      return this.stack = [], this.createSetAssignment(e, a, this.serialize(t)), this.stack = i2, "";
    }
    if (this.isIndexedValueInStack(t)) {
      let a = this.getRefParam(t.i);
      if (this.markRef(e), r.t !== 4 && r.i != null && this.isMarked(r.i)) {
        let l2 = "(" + this.serialize(r) + ",[" + n + "," + n + "])";
        return this.createSetAssignment(e, this.getRefParam(r.i), a), this.createDeleteAssignment(e, n), l2;
      }
      let i2 = this.stack;
      return this.stack = [], this.createSetAssignment(e, this.serialize(r), a), this.stack = i2, "";
    }
    return "[" + this.serialize(r) + "," + this.serialize(t) + "]";
  }
  serializeMap(e) {
    let r = Br$1, t = e.e.s, n = e.i, a = e.f, i2 = this.getRefParam(a.i);
    if (t) {
      let l2 = e.e.k, c2 = e.e.v;
      this.stack.push(n);
      let p2 = this.serializeMapEntry(n, l2[0], c2[0], i2);
      for (let h2 = 1, X2 = p2; h2 < t; h2++) X2 = this.serializeMapEntry(n, l2[h2], c2[h2], i2), p2 += (X2 && p2 && ",") + X2;
      this.stack.pop(), p2 && (r += "([" + p2 + "])");
    }
    return a.t === 26 && (this.markRef(a.i), r = "(" + this.serialize(a) + "," + r + ")"), this.assignIndexedValue(n, r);
  }
  serializeArrayBuffer(e) {
    let r = "new Uint8Array(", t = e.s, n = t.length;
    if (n) {
      r += "[" + t[0];
      for (let a = 1; a < n; a++) r += "," + t[a];
      r += "]";
    }
    return this.assignIndexedValue(e.i, r + ").buffer");
  }
  serializeTypedArray(e) {
    return this.assignIndexedValue(e.i, "new " + e.c + "(" + this.serialize(e.f) + "," + e.b + "," + e.l + ")");
  }
  serializeDataView(e) {
    return this.assignIndexedValue(e.i, "new DataView(" + this.serialize(e.f) + "," + e.b + "," + e.l + ")");
  }
  serializeAggregateError(e) {
    let r = e.i;
    this.stack.push(r);
    let t = this.serializeDictionary(e, 'new AggregateError([],"' + e.m + '")');
    return this.stack.pop(), t;
  }
  serializeError(e) {
    return this.serializeDictionary(e, "new " + ue$3[e.s] + '("' + e.m + '")');
  }
  serializePromise(e) {
    let r, t = e.f, n = e.i, a = e.s ? jr$1 : _r$1;
    if (this.isIndexedValueInStack(t)) {
      let i2 = this.getRefParam(t.i);
      r = a + (e.s ? "().then(" + this.createFunction([], i2) + ")" : "().catch(" + this.createEffectfulFunction([], "throw " + i2) + ")");
    } else {
      this.stack.push(n);
      let i2 = this.serialize(t);
      this.stack.pop(), r = a + "(" + i2 + ")";
    }
    return this.assignIndexedValue(n, r);
  }
  serializeWellKnownSymbol(e) {
    return this.assignIndexedValue(e.i, $e$1[e.s]);
  }
  serializeBoxed(e) {
    return this.assignIndexedValue(e.i, "Object(" + this.serialize(e.f) + ")");
  }
  serializePlugin(e) {
    let r = this.plugins;
    if (r) for (let t = 0, n = r.length; t < n; t++) {
      let a = r[t];
      if (a.tag === e.c) return this.assignIndexedValue(e.i, a.serialize(e.s, this, { id: e.i }));
    }
    throw new W$3(e.c);
  }
  getConstructor(e) {
    let r = this.serialize(e);
    return r === this.getRefParam(e.i) ? r : "(" + r + ")";
  }
  serializePromiseConstructor(e) {
    let r = this.assignIndexedValue(e.s, "{p:0,s:0,f:0}");
    return this.assignIndexedValue(e.i, this.getConstructor(e.f) + "(" + r + ")");
  }
  serializePromiseResolve(e) {
    return this.getConstructor(e.a[0]) + "(" + this.getRefParam(e.i) + "," + this.serialize(e.a[1]) + ")";
  }
  serializePromiseReject(e) {
    return this.getConstructor(e.a[0]) + "(" + this.getRefParam(e.i) + "," + this.serialize(e.a[1]) + ")";
  }
  serializeSpecialReference(e) {
    return this.assignIndexedValue(e.i, cr$1(this.features, e.s));
  }
  serializeIteratorFactory(e) {
    let r = "", t = false;
    return e.f.t !== 4 && (this.markRef(e.f.i), r = "(" + this.serialize(e.f) + ",", t = true), r += this.assignIndexedValue(e.i, this.createFunction(["s"], this.createFunction(["i", "c", "d", "t"], "(i=0,t={[" + this.getRefParam(e.f.i) + "]:" + this.createFunction([], "t") + ",next:" + this.createEffectfulFunction([], "if(i>s.d)return{done:!0,value:void 0};if(d=s.v[c=i++],c===s.t)throw d;return{done:c===s.d,value:d}") + "})"))), t && (r += ")"), r;
  }
  serializeIteratorFactoryInstance(e) {
    return this.getConstructor(e.a[0]) + "(" + this.serialize(e.a[1]) + ")";
  }
  serializeAsyncIteratorFactory(e) {
    let r = e.a[0], t = e.a[1], n = "";
    r.t !== 4 && (this.markRef(r.i), n += "(" + this.serialize(r)), t.t !== 4 && (this.markRef(t.i), n += (n ? "," : "(") + this.serialize(t)), n && (n += ",");
    let a = this.assignIndexedValue(e.i, this.createFunction(["s"], this.createFunction(["b", "c", "p", "d", "e", "t", "f"], "(b=[],c=0,p=[],d=-1,e=!1,f=" + this.createEffectfulFunction(["i", "l"], "for(i=0,l=p.length;i<l;i++)p[i].s({done:!0,value:void 0})") + ",s.on({next:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!1,value:v});b.push(v)") + ",throw:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.f(v);f(),d=b.length,e=!0,b.push(v)") + ",return:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!0,value:v});f(),d=b.length,b.push(v)") + "}),t={[" + this.getRefParam(t.i) + "]:" + this.createFunction([], "t.p") + ",next:" + this.createEffectfulFunction(["i", "t", "v"], "if(d===-1){return((i=c++)>=b.length)?(" + this.getRefParam(r.i) + "(t={p:0,s:0,f:0}),p.push(t),t.p):{done:!1,value:b[i]}}if(c>d)return{done:!0,value:void 0};if(v=b[i=c++],i!==d)return{done:!1,value:v};if(e)throw v;return{done:!0,value:v}") + "})")));
    return n ? n + a + ")" : a;
  }
  serializeAsyncIteratorFactoryInstance(e) {
    return this.getConstructor(e.a[0]) + "(" + this.serialize(e.a[1]) + ")";
  }
  serializeStreamConstructor(e) {
    let r = this.assignIndexedValue(e.i, this.getConstructor(e.f) + "()"), t = e.a.length;
    if (t) {
      let n = this.serialize(e.a[0]);
      for (let a = 1; a < t; a++) n += "," + this.serialize(e.a[a]);
      return "(" + r + "," + n + "," + this.getRefParam(e.i) + ")";
    }
    return r;
  }
  serializeStreamNext(e) {
    return this.getRefParam(e.i) + ".next(" + this.serialize(e.f) + ")";
  }
  serializeStreamThrow(e) {
    return this.getRefParam(e.i) + ".throw(" + this.serialize(e.f) + ")";
  }
  serializeStreamReturn(e) {
    return this.getRefParam(e.i) + ".return(" + this.serialize(e.f) + ")";
  }
  serialize(e) {
    try {
      switch (e.t) {
        case 2:
          return qe$1[e.s];
        case 0:
          return "" + e.s;
        case 1:
          return '"' + e.s + '"';
        case 3:
          return e.s + "n";
        case 4:
          return this.getRefParam(e.i);
        case 18:
          return this.serializeReference(e);
        case 9:
          return this.serializeArray(e);
        case 10:
          return this.serializeObject(e);
        case 11:
          return this.serializeNullConstructor(e);
        case 5:
          return this.serializeDate(e);
        case 6:
          return this.serializeRegExp(e);
        case 7:
          return this.serializeSet(e);
        case 8:
          return this.serializeMap(e);
        case 19:
          return this.serializeArrayBuffer(e);
        case 16:
        case 15:
          return this.serializeTypedArray(e);
        case 20:
          return this.serializeDataView(e);
        case 14:
          return this.serializeAggregateError(e);
        case 13:
          return this.serializeError(e);
        case 12:
          return this.serializePromise(e);
        case 17:
          return this.serializeWellKnownSymbol(e);
        case 21:
          return this.serializeBoxed(e);
        case 22:
          return this.serializePromiseConstructor(e);
        case 23:
          return this.serializePromiseResolve(e);
        case 24:
          return this.serializePromiseReject(e);
        case 25:
          return this.serializePlugin(e);
        case 26:
          return this.serializeSpecialReference(e);
        case 27:
          return this.serializeIteratorFactory(e);
        case 28:
          return this.serializeIteratorFactoryInstance(e);
        case 29:
          return this.serializeAsyncIteratorFactory(e);
        case 30:
          return this.serializeAsyncIteratorFactoryInstance(e);
        case 31:
          return this.serializeStreamConstructor(e);
        case 32:
          return this.serializeStreamNext(e);
        case 33:
          return this.serializeStreamThrow(e);
        case 34:
          return this.serializeStreamReturn(e);
        default:
          throw new y$3(e);
      }
    } catch (r) {
      throw new Ce$2(r);
    }
  }
};
var D$2 = class D extends V$1 {
  constructor(r) {
    super(r);
    this.mode = "cross";
    this.scopeId = r.scopeId;
  }
  getRefParam(r) {
    return Q$1 + "[" + r + "]";
  }
  assignIndexedValue(r, t) {
    return this.getRefParam(r) + "=" + t;
  }
  serializeTop(r) {
    let t = this.serialize(r), n = r.i;
    if (n == null) return t;
    let a = this.resolvePatches(), i2 = this.getRefParam(n), l2 = this.scopeId == null ? "" : Q$1, c2 = a ? "(" + t + "," + a + i2 + ")" : t;
    if (l2 === "") return r.t === 10 && !a ? "(" + c2 + ")" : c2;
    let p2 = this.scopeId == null ? "()" : "(" + Q$1 + '["' + d$2(this.scopeId) + '"])';
    return "(" + this.createFunction([l2], c2) + ")" + p2;
  }
};
var v$2 = class v extends Y$3 {
  parseItems(e) {
    let r = [];
    for (let t = 0, n = e.length; t < n; t++) t in e && (r[t] = this.parseTop(e[t]));
    return r;
  }
  parseArray(e, r) {
    return Ne$2(e, r, this.parseItems(r));
  }
  parseProperties(e) {
    let r = Object.entries(e), t = [], n = [];
    for (let i2 = 0, l2 = r.length; i2 < l2; i2++) t.push(d$2(r[i2][0])), n.push(this.parseTop(r[i2][1]));
    let a = Symbol.iterator;
    return a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(M$2(this.parseIteratorFactory(), this.parseTop(J$3(e))))), a = Symbol.asyncIterator, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(U$2(this.parseAsyncIteratorFactory(), this.parseTop(K$3())))), a = Symbol.toStringTag, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(w$3(e[a]))), a = Symbol.isConcatSpreadable, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(e[a] ? I$3 : A$3)), { k: t, v: n, s: t.length };
  }
  parsePlainObject(e, r, t) {
    return this.createObjectNode(e, r, t, this.parseProperties(r));
  }
  parseBoxed(e, r) {
    return be$2(e, this.parseTop(r.valueOf()));
  }
  parseTypedArray(e, r) {
    return xe$2(e, r, this.parseTop(r.buffer));
  }
  parseBigIntTypedArray(e, r) {
    return Ie$2(e, r, this.parseTop(r.buffer));
  }
  parseDataView(e, r) {
    return Ae$2(e, r, this.parseTop(r.buffer));
  }
  parseError(e, r) {
    let t = j$3(r, this.features);
    return we$2(e, r, t ? this.parseProperties(t) : s$3);
  }
  parseAggregateError(e, r) {
    let t = j$3(r, this.features);
    return Ee$2(e, r, t ? this.parseProperties(t) : s$3);
  }
  parseMap(e, r) {
    let t = [], n = [];
    for (let [a, i2] of r.entries()) t.push(this.parseTop(a)), n.push(this.parseTop(i2));
    return this.createMapNode(e, t, n, r.size);
  }
  parseSet(e, r) {
    let t = [];
    for (let n of r.keys()) t.push(this.parseTop(n));
    return Pe$2(e, r.size, t);
  }
  parsePlugin(e, r) {
    let t = this.plugins;
    if (t) for (let n = 0, a = t.length; n < a; n++) {
      let i2 = t[n];
      if (i2.parse.sync && i2.test(r)) return _$3(e, i2.tag, i2.parse.sync(r, this, { id: e }));
    }
  }
  parseStream(e, r) {
    return L$2(e, this.parseSpecialReference(4), []);
  }
  parsePromise(e, r) {
    return this.createPromiseConstructorNode(e, this.createIndex({}));
  }
  parseObject(e, r) {
    if (Array.isArray(r)) return this.parseArray(e, r);
    if (Fe$2(r)) return this.parseStream(e, r);
    let t = r.constructor;
    if (t === C$3) return this.parseTop(r.replacement);
    let n = this.parsePlugin(e, r);
    if (n) return n;
    switch (t) {
      case Object:
        return this.parsePlainObject(e, r, false);
      case void 0:
        return this.parsePlainObject(e, r, true);
      case Date:
        return he$2(e, r);
      case RegExp:
        return ye$2(e, r);
      case Error:
      case EvalError:
      case RangeError:
      case ReferenceError:
      case SyntaxError:
      case TypeError:
      case URIError:
        return this.parseError(e, r);
      case Number:
      case Boolean:
      case String:
      case BigInt:
        return this.parseBoxed(e, r);
      case ArrayBuffer:
        return ve$2(e, r);
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Uint8ClampedArray:
      case Float32Array:
      case Float64Array:
        return this.parseTypedArray(e, r);
      case DataView:
        return this.parseDataView(e, r);
      case Map:
        return this.parseMap(e, r);
      case Set:
        return this.parseSet(e, r);
    }
    if (t === Promise || r instanceof Promise) return this.parsePromise(e, r);
    let a = this.features;
    if (a & 16) switch (t) {
      case BigInt64Array:
      case BigUint64Array:
        return this.parseBigIntTypedArray(e, r);
    }
    if (a & 1 && typeof AggregateError != "undefined" && (t === AggregateError || r instanceof AggregateError)) return this.parseAggregateError(e, r);
    if (r instanceof Error) return this.parseError(e, r);
    if (Symbol.iterator in r || Symbol.asyncIterator in r) return this.parsePlainObject(e, r, !!t);
    throw new g$3(r);
  }
  parseFunction(e) {
    let r = this.getReference(e);
    if (r.type !== 0) return r.value;
    let t = this.parsePlugin(r.value, e);
    if (t) return t;
    throw new g$3(e);
  }
  parseTop(e) {
    switch (typeof e) {
      case "boolean":
        return e ? I$3 : A$3;
      case "undefined":
        return pe$3;
      case "string":
        return w$3(e);
      case "number":
        return ge$2(e);
      case "bigint":
        return Se$2(e);
      case "object": {
        if (e) {
          let r = this.getReference(e);
          return r.type === 0 ? this.parseObject(r.value, e) : r.value;
        }
        return de$2;
      }
      case "symbol":
        return this.parseWellKnownSymbol(e);
      case "function":
        return this.parseFunction(e);
      default:
        throw new g$3(e);
    }
  }
  parse(e) {
    try {
      return this.parseTop(e);
    } catch (r) {
      throw r instanceof E$3 ? r : new E$3(r);
    }
  }
};
var oe$2 = class oe extends v$2 {
  constructor(r) {
    super(r);
    this.alive = true;
    this.pending = 0;
    this.initial = true;
    this.buffer = [];
    this.onParseCallback = r.onParse, this.onErrorCallback = r.onError, this.onDoneCallback = r.onDone;
  }
  onParseInternal(r, t) {
    try {
      this.onParseCallback(r, t);
    } catch (n) {
      this.onError(n);
    }
  }
  flush() {
    for (let r = 0, t = this.buffer.length; r < t; r++) this.onParseInternal(this.buffer[r], false);
  }
  onParse(r) {
    this.initial ? this.buffer.push(r) : this.onParseInternal(r, false);
  }
  onError(r) {
    if (this.onErrorCallback) this.onErrorCallback(r);
    else throw r;
  }
  onDone() {
    this.onDoneCallback && this.onDoneCallback();
  }
  pushPendingState() {
    this.pending++;
  }
  popPendingState() {
    --this.pending <= 0 && this.onDone();
  }
  parseProperties(r) {
    let t = Object.entries(r), n = [], a = [];
    for (let l2 = 0, c2 = t.length; l2 < c2; l2++) n.push(d$2(t[l2][0])), a.push(this.parseTop(t[l2][1]));
    let i2 = Symbol.iterator;
    return i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(M$2(this.parseIteratorFactory(), this.parseTop(J$3(r))))), i2 = Symbol.asyncIterator, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(U$2(this.parseAsyncIteratorFactory(), this.parseTop(Ve$2(r))))), i2 = Symbol.toStringTag, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(w$3(r[i2]))), i2 = Symbol.isConcatSpreadable, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(r[i2] ? I$3 : A$3)), { k: n, v: a, s: n.length };
  }
  handlePromiseSuccess(r, t) {
    let n = this.parseWithError(t);
    n && this.onParse(u$4(23, r, s$3, s$3, s$3, s$3, s$3, s$3, [this.parseSpecialReference(2), n], s$3, s$3, s$3)), this.popPendingState();
  }
  handlePromiseFailure(r, t) {
    if (this.alive) {
      let n = this.parseWithError(t);
      n && this.onParse(u$4(24, r, s$3, s$3, s$3, s$3, s$3, s$3, [this.parseSpecialReference(3), n], s$3, s$3, s$3));
    }
    this.popPendingState();
  }
  parsePromise(r, t) {
    let n = this.createIndex({});
    return t.then(this.handlePromiseSuccess.bind(this, n), this.handlePromiseFailure.bind(this, n)), this.pushPendingState(), this.createPromiseConstructorNode(r, n);
  }
  parsePlugin(r, t) {
    let n = this.plugins;
    if (n) for (let a = 0, i2 = n.length; a < i2; a++) {
      let l2 = n[a];
      if (l2.parse.stream && l2.test(t)) return _$3(r, l2.tag, l2.parse.stream(t, this, { id: r }));
    }
    return s$3;
  }
  parseStream(r, t) {
    let n = L$2(r, this.parseSpecialReference(4), []);
    return this.pushPendingState(), t.on({ next: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Re$2(r, i2));
      }
    }, throw: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Te$1(r, i2));
      }
      this.popPendingState();
    }, return: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Oe$2(r, i2));
      }
      this.popPendingState();
    } }), n;
  }
  parseWithError(r) {
    try {
      return this.parseTop(r);
    } catch (t) {
      return this.onError(t), s$3;
    }
  }
  start(r) {
    let t = this.parseWithError(r);
    t && (this.onParseInternal(t, true), this.initial = false, this.flush(), this.pending <= 0 && this.destroy());
  }
  destroy() {
    this.alive && (this.onDone(), this.alive = false);
  }
  isAlive() {
    return this.alive;
  }
};
var G$3 = class G extends oe$2 {
  constructor() {
    super(...arguments);
    this.mode = "cross";
  }
};
function gr$1(o2, e) {
  let r = m$3(e.plugins), t = new G$3({ plugins: r, refs: e.refs, disabledFeatures: e.disabledFeatures, onParse(n, a) {
    let i2 = new D$2({ plugins: r, features: t.features, scopeId: e.scopeId, markedRefs: t.marked }), l2;
    try {
      l2 = i2.serializeTop(n);
    } catch (c2) {
      e.onError && e.onError(c2);
      return;
    }
    e.onSerialize(l2, a);
  }, onError: e.onError, onDone: e.onDone });
  return t.start(o2), t.destroy.bind(t);
}
var De = class {
  constructor(e) {
    this.options = e;
    this.alive = true;
    this.flushed = false;
    this.done = false;
    this.pending = 0;
    this.cleanups = [];
    this.refs = /* @__PURE__ */ new Map();
    this.keys = /* @__PURE__ */ new Set();
    this.ids = 0;
    this.plugins = m$3(e.plugins);
  }
  write(e, r) {
    this.alive && !this.flushed && (this.pending++, this.keys.add(e), this.cleanups.push(gr$1(r, { plugins: this.plugins, scopeId: this.options.scopeId, refs: this.refs, disabledFeatures: this.options.disabledFeatures, onError: this.options.onError, onSerialize: (t, n) => {
      this.alive && this.options.onData(n ? this.options.globalIdentifier + '["' + d$2(e) + '"]=' + t : t);
    }, onDone: () => {
      this.alive && (this.pending--, this.pending <= 0 && this.flushed && !this.done && this.options.onDone && (this.options.onDone(), this.done = true));
    } })));
  }
  getNextID() {
    for (; this.keys.has("" + this.ids); ) this.ids++;
    return "" + this.ids;
  }
  push(e) {
    let r = this.getNextID();
    return this.write(r, e), r;
  }
  flush() {
    this.alive && (this.flushed = true, this.pending <= 0 && !this.done && this.options.onDone && (this.options.onDone(), this.done = true));
  }
  close() {
    if (this.alive) {
      for (let e = 0, r = this.cleanups.length; e < r; e++) this.cleanups[e]();
      !this.done && this.options.onDone && (this.options.onDone(), this.done = true), this.alive = false;
    }
  }
};
function h(e) {
  e(this.reason);
}
function A$2(e) {
  this.addEventListener("abort", h.bind(this, e), { once: true });
}
function E$2(e) {
  return new Promise(A$2.bind(e));
}
var o = class {
  constructor() {
    this.controller = new AbortController();
  }
}, F$1 = Hr$1({ tag: "seroval-plugins/web/AbortSignalController", test(e) {
  return e instanceof o;
}, parse: { stream() {
} }, serialize(e) {
  return "new AbortController";
}, deserialize(e) {
  return new o();
} }), s$2 = class s {
  constructor(r, a) {
    this.controller = r;
    this.reason = a;
  }
}, D$1 = Hr$1({ extends: [F$1], tag: "seroval-plugins/web/AbortSignalAbort", test(e) {
  return e instanceof s$2;
}, parse: { stream(e, r) {
  return { controller: r.parse(e.controller), reason: r.parse(e.reason) };
} }, serialize(e, r) {
  return r.serialize(e.controller) + ".abort(" + r.serialize(e.reason) + ")";
}, deserialize(e, r) {
  let a = r.deserialize(e.controller), t = r.deserialize(e.reason);
  return a.controller.abort(t), new s$2(a, t);
} });
var I$2 = Hr$1({ tag: "seroval-plugins/web/AbortSignal", extends: [D$1], test(e) {
  return typeof AbortSignal == "undefined" ? false : e instanceof AbortSignal;
}, parse: { sync(e, r) {
  return e.aborted ? { type: 1, reason: r.parse(e.reason) } : { type: 0 };
}, async async(e, r) {
  if (e.aborted) return { type: 1, reason: await r.parse(e.reason) };
  let a = await E$2(e);
  return { type: 1, reason: await r.parse(a) };
}, stream(e, r) {
  if (e.aborted) return { type: 1, reason: r.parse(e.reason) };
  let a = new o();
  return r.pushPendingState(), e.addEventListener("abort", () => {
    let t = r.parseWithError(new s$2(a, e.reason));
    t && r.onParse(t), r.popPendingState();
  }, { once: true }), { type: 2, controller: r.parse(a) };
} }, serialize(e, r) {
  return e.type === 0 ? "(new AbortController).signal" : e.type === 1 ? "AbortSignal.abort(" + r.serialize(e.reason) + ")" : "(" + r.serialize(e.controller) + ").signal";
}, deserialize(e, r) {
  return e.type === 0 ? new AbortController().signal : e.type === 1 ? AbortSignal.abort(r.deserialize(e.reason)) : r.deserialize(e.controller).controller.signal;
} }), C$2 = I$2;
function f$2(e) {
  return { detail: e.detail, bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var q = Hr$1({ tag: "seroval-plugins/web/CustomEvent", test(e) {
  return typeof CustomEvent == "undefined" ? false : e instanceof CustomEvent;
}, parse: { sync(e, r) {
  return { type: r.parse(e.type), options: r.parse(f$2(e)) };
}, async async(e, r) {
  return { type: await r.parse(e.type), options: await r.parse(f$2(e)) };
}, stream(e, r) {
  return { type: r.parse(e.type), options: r.parse(f$2(e)) };
} }, serialize(e, r) {
  return "new CustomEvent(" + r.serialize(e.type) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new CustomEvent(r.deserialize(e.type), r.deserialize(e.options));
} }), H = q;
var T$2 = Hr$1({ tag: "seroval-plugins/web/DOMException", test(e) {
  return typeof DOMException == "undefined" ? false : e instanceof DOMException;
}, parse: { sync(e, r) {
  return { name: r.parse(e.name), message: r.parse(e.message) };
}, async async(e, r) {
  return { name: await r.parse(e.name), message: await r.parse(e.message) };
}, stream(e, r) {
  return { name: r.parse(e.name), message: r.parse(e.message) };
} }, serialize(e, r) {
  return "new DOMException(" + r.serialize(e.message) + "," + r.serialize(e.name) + ")";
}, deserialize(e, r) {
  return new DOMException(r.deserialize(e.message), r.deserialize(e.name));
} }), _$2 = T$2;
function m$2(e) {
  return { bubbles: e.bubbles, cancelable: e.cancelable, composed: e.composed };
}
var j$2 = Hr$1({ tag: "seroval-plugins/web/Event", test(e) {
  return typeof Event == "undefined" ? false : e instanceof Event;
}, parse: { sync(e, r) {
  return { type: r.parse(e.type), options: r.parse(m$2(e)) };
}, async async(e, r) {
  return { type: await r.parse(e.type), options: await r.parse(m$2(e)) };
}, stream(e, r) {
  return { type: r.parse(e.type), options: r.parse(m$2(e)) };
} }, serialize(e, r) {
  return "new Event(" + r.serialize(e.type) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Event(r.deserialize(e.type), r.deserialize(e.options));
} }), Y$2 = j$2;
var W$2 = Hr$1({ tag: "seroval-plugins/web/File", test(e) {
  return typeof File == "undefined" ? false : e instanceof File;
}, parse: { async async(e, r) {
  return { name: await r.parse(e.name), options: await r.parse({ type: e.type, lastModified: e.lastModified }), buffer: await r.parse(await e.arrayBuffer()) };
} }, serialize(e, r) {
  return "new File([" + r.serialize(e.buffer) + "]," + r.serialize(e.name) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new File([r.deserialize(e.buffer)], r.deserialize(e.name), r.deserialize(e.options));
} }), c = W$2;
function g$2(e) {
  let r = [];
  return e.forEach((a, t) => {
    r.push([t, a]);
  }), r;
}
var i = {}, G$2 = Hr$1({ tag: "seroval-plugins/web/FormDataFactory", test(e) {
  return e === i;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize(e, r) {
  return r.createEffectfulFunction(["e", "f", "i", "s", "t"], "f=new FormData;for(i=0,s=e.length;i<s;i++)f.append((t=e[i])[0],t[1]);return f");
}, deserialize() {
  return i;
} }), J$2 = Hr$1({ tag: "seroval-plugins/web/FormData", extends: [c, G$2], test(e) {
  return typeof FormData == "undefined" ? false : e instanceof FormData;
}, parse: { sync(e, r) {
  return { factory: r.parse(i), entries: r.parse(g$2(e)) };
}, async async(e, r) {
  return { factory: await r.parse(i), entries: await r.parse(g$2(e)) };
}, stream(e, r) {
  return { factory: r.parse(i), entries: r.parse(g$2(e)) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.entries) + ")";
}, deserialize(e, r) {
  let a = new FormData(), t = r.deserialize(e.entries);
  for (let n = 0, R2 = t.length; n < R2; n++) {
    let b = t[n];
    a.append(b[0], b[1]);
  }
  return a;
} }), K$2 = J$2;
function y$2(e) {
  let r = [];
  return e.forEach((a, t) => {
    r.push([t, a]);
  }), r;
}
var X = Hr$1({ tag: "seroval-plugins/web/Headers", test(e) {
  return typeof Headers == "undefined" ? false : e instanceof Headers;
}, parse: { sync(e, r) {
  return r.parse(y$2(e));
}, async async(e, r) {
  return await r.parse(y$2(e));
}, stream(e, r) {
  return r.parse(y$2(e));
} }, serialize(e, r) {
  return "new Headers(" + r.serialize(e) + ")";
}, deserialize(e, r) {
  return new Headers(r.deserialize(e));
} }), l = X;
var p$1 = {}, ee$3 = Hr$1({ tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === p$1;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize(e, r) {
  return r.createFunction(["d"], "new ReadableStream({start:" + r.createEffectfulFunction(["c"], "d.on({next:" + r.createEffectfulFunction(["v"], "c.enqueue(v)") + ",throw:" + r.createEffectfulFunction(["v"], "c.error(v)") + ",return:" + r.createEffectfulFunction([], "c.close()") + "})") + "})");
}, deserialize() {
  return p$1;
} });
function w$2(e) {
  let r = K$3(), a = e.getReader();
  async function t() {
    try {
      let n = await a.read();
      n.done ? r.return(n.value) : (r.next(n.value), await t());
    } catch (n) {
      r.throw(n);
    }
  }
  return t().catch(() => {
  }), r;
}
var re$2 = Hr$1({ tag: "seroval/plugins/web/ReadableStream", extends: [ee$3], test(e) {
  return typeof ReadableStream == "undefined" ? false : e instanceof ReadableStream;
}, parse: { sync(e, r) {
  return { factory: r.parse(p$1), stream: r.parse(K$3()) };
}, async async(e, r) {
  return { factory: await r.parse(p$1), stream: await r.parse(w$2(e)) };
}, stream(e, r) {
  return { factory: r.parse(p$1), stream: r.parse(w$2(e)) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.stream) + ")";
}, deserialize(e, r) {
  let a = r.deserialize(e.stream);
  return new ReadableStream({ start(t) {
    a.on({ next(n) {
      t.enqueue(n);
    }, throw(n) {
      t.error(n);
    }, return() {
      t.close();
    } });
  } });
} }), u$3 = re$2;
function P$1(e, r) {
  return { body: r, cache: e.cache, credentials: e.credentials, headers: e.headers, integrity: e.integrity, keepalive: e.keepalive, method: e.method, mode: e.mode, redirect: e.redirect, referrer: e.referrer, referrerPolicy: e.referrerPolicy };
}
var te = Hr$1({ tag: "seroval-plugins/web/Request", extends: [u$3, l], test(e) {
  return typeof Request == "undefined" ? false : e instanceof Request;
}, parse: { async async(e, r) {
  return { url: await r.parse(e.url), options: await r.parse(P$1(e, e.body ? await e.clone().arrayBuffer() : null)) };
}, stream(e, r) {
  return { url: r.parse(e.url), options: r.parse(P$1(e, e.clone().body)) };
} }, serialize(e, r) {
  return "new Request(" + r.serialize(e.url) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Request(r.deserialize(e.url), r.deserialize(e.options));
} }), ne$1 = te;
function N$1(e) {
  return { headers: e.headers, status: e.status, statusText: e.statusText };
}
var se$1 = Hr$1({ tag: "seroval-plugins/web/Response", extends: [u$3, l], test(e) {
  return typeof Response == "undefined" ? false : e instanceof Response;
}, parse: { async async(e, r) {
  return { body: await r.parse(e.body ? await e.clone().arrayBuffer() : null), options: await r.parse(N$1(e)) };
}, stream(e, r) {
  return { body: r.parse(e.clone().body), options: r.parse(N$1(e)) };
} }, serialize(e, r) {
  return "new Response(" + r.serialize(e.body) + "," + r.serialize(e.options) + ")";
}, deserialize(e, r) {
  return new Response(r.deserialize(e.body), r.deserialize(e.options));
} }), ie$2 = se$1;
var pe$2 = Hr$1({ tag: "seroval-plugins/web/URL", test(e) {
  return typeof URL == "undefined" ? false : e instanceof URL;
}, parse: { sync(e, r) {
  return r.parse(e.href);
}, async async(e, r) {
  return await r.parse(e.href);
}, stream(e, r) {
  return r.parse(e.href);
} }, serialize(e, r) {
  return "new URL(" + r.serialize(e) + ")";
}, deserialize(e, r) {
  return new URL(r.deserialize(e));
} }), ue$2 = pe$2;
var fe$2 = Hr$1({ tag: "seroval-plugins/web/URLSearchParams", test(e) {
  return typeof URLSearchParams == "undefined" ? false : e instanceof URLSearchParams;
}, parse: { sync(e, r) {
  return r.parse(e.toString());
}, async async(e, r) {
  return await r.parse(e.toString());
}, stream(e, r) {
  return r.parse(e.toString());
} }, serialize(e, r) {
  return "new URLSearchParams(" + r.serialize(e) + ")";
}, deserialize(e, r) {
  return new URLSearchParams(r.deserialize(e));
} }), me$2 = fe$2;
const booleans = [
  "allowfullscreen",
  "async",
  "alpha",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "disabled",
  "formnovalidate",
  "hidden",
  "indeterminate",
  "inert",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "seamless",
  "selected",
  "adauctionheaders",
  "browsingtopics",
  "credentialless",
  "defaultchecked",
  "defaultmuted",
  "defaultselected",
  "defer",
  "disablepictureinpicture",
  "disableremoteplayback",
  "preservespitch",
  "shadowrootclonable",
  "shadowrootcustomelementregistry",
  "shadowrootdelegatesfocus",
  "shadowrootserializable",
  "sharedstoragewritable"
];
const BooleanAttributes = /* @__PURE__ */ new Set(booleans);
const ChildProperties = /* @__PURE__ */ new Set(["innerHTML", "textContent", "innerText", "children"]);
const Aliases = /* @__PURE__ */ Object.assign(/* @__PURE__ */ Object.create(null), {
  className: "class",
  htmlFor: "for"
});
const ES2017FLAG = R$2.AggregateError | R$2.BigIntTypedArray;
const GLOBAL_IDENTIFIER = "_$HY.r";
function createSerializer({
  onData,
  onDone,
  scopeId,
  onError
}) {
  return new De({
    scopeId,
    plugins: [
      C$2,
      H,
      _$2,
      Y$2,
      K$2,
      l,
      u$3,
      ne$1,
      ie$2,
      me$2,
      ue$2
    ],
    globalIdentifier: GLOBAL_IDENTIFIER,
    disabledFeatures: ES2017FLAG,
    onData,
    onDone,
    onError
  });
}
function getLocalHeaderScript(id) {
  return xr$1(id) + ";";
}
const VOID_ELEMENTS = /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i;
const REPLACE_SCRIPT = `function $df(e,n,o,t){if(n=document.getElementById(e),o=document.getElementById("pl-"+e)){for(;o&&8!==o.nodeType&&o.nodeValue!=="pl-"+e;)t=o.nextSibling,o.remove(),o=t;_$HY.done?o.remove():o.replaceWith(n.content)}n.remove(),_$HY.fe(e)}`;
function renderToStream(code, options = {}) {
  let {
    nonce,
    onCompleteShell,
    onCompleteAll,
    renderId,
    noScripts
  } = options;
  let dispose;
  const blockingPromises = [];
  const pushTask = (task) => {
    if (noScripts) return;
    if (!tasks && !firstFlushed) {
      tasks = getLocalHeaderScript(renderId);
    }
    tasks += task + ";";
    if (!timer && firstFlushed) {
      timer = setTimeout(writeTasks);
    }
  };
  const onDone = () => {
    writeTasks();
    doShell();
    onCompleteAll && onCompleteAll({
      write(v4) {
        !completed && buffer.write(v4);
      }
    });
    writable && writable.end();
    completed = true;
    if (firstFlushed) dispose();
  };
  const serializer = createSerializer({
    scopeId: options.renderId,
    onData: pushTask,
    onDone,
    onError: options.onError
  });
  const flushEnd = () => {
    if (!registry.size) {
      queue(() => queue(() => serializer.flush()));
    }
  };
  const registry = /* @__PURE__ */ new Map();
  const writeTasks = () => {
    if (tasks.length && !completed && firstFlushed) {
      buffer.write(`<script${nonce ? ` nonce="${nonce}"` : ""}>${tasks}<\/script>`);
      tasks = "";
    }
    timer && clearTimeout(timer);
    timer = null;
  };
  let context;
  let writable;
  let tmp = "";
  let tasks = "";
  let firstFlushed = false;
  let completed = false;
  let shellCompleted = false;
  let scriptFlushed = false;
  let timer = null;
  let buffer = {
    write(payload) {
      tmp += payload;
    }
  };
  sharedConfig.context = context = {
    id: renderId || "",
    count: 0,
    async: true,
    resources: {},
    lazy: {},
    suspense: {},
    assets: [],
    nonce,
    block(p2) {
      if (!firstFlushed) blockingPromises.push(p2);
    },
    replace(id, payloadFn) {
      if (firstFlushed) return;
      const placeholder = `<!--!$${id}-->`;
      const first = html.indexOf(placeholder);
      if (first === -1) return;
      const last2 = html.indexOf(`<!--!$/${id}-->`, first + placeholder.length);
      html = html.slice(0, first) + resolveSSRNode(escape(payloadFn())) + html.slice(last2 + placeholder.length + 1);
    },
    serialize(id, p2, wait) {
      const serverOnly = sharedConfig.context.noHydrate;
      if (!firstFlushed && wait && typeof p2 === "object" && "then" in p2) {
        blockingPromises.push(p2);
        !serverOnly && p2.then((d2) => {
          serializer.write(id, d2);
        }).catch((e) => {
          serializer.write(id, e);
        });
      } else if (!serverOnly) serializer.write(id, p2);
    },
    roots: 0,
    nextRoot() {
      return this.renderId + "i-" + this.roots++;
    },
    registerFragment(key) {
      if (!registry.has(key)) {
        let resolve, reject;
        const p2 = new Promise((r, rej) => (resolve = r, reject = rej));
        registry.set(key, (err) => queue(() => queue(() => {
          err ? reject(err) : resolve(true);
          queue(flushEnd);
        })));
        serializer.write(key, p2);
      }
      return (value, error) => {
        if (registry.has(key)) {
          const resolve = registry.get(key);
          registry.delete(key);
          if (waitForFragments(registry, key)) {
            resolve();
            return;
          }
          if (!completed) {
            if (!firstFlushed) {
              queue(() => html = replacePlaceholder(html, key, value !== void 0 ? value : ""));
              resolve(error);
            } else {
              buffer.write(`<template id="${key}">${value !== void 0 ? value : " "}</template>`);
              pushTask(`$df("${key}")${!scriptFlushed ? ";" + REPLACE_SCRIPT : ""}`);
              resolve(error);
              scriptFlushed = true;
            }
          }
        }
        return firstFlushed;
      };
    }
  };
  let html = createRoot((d2) => {
    dispose = d2;
    return resolveSSRNode(escape(code()));
  });
  function doShell() {
    if (shellCompleted) return;
    sharedConfig.context = context;
    context.noHydrate = true;
    html = injectAssets(context.assets, html);
    if (tasks.length) html = injectScripts(html, tasks, nonce);
    buffer.write(html);
    tasks = "";
    onCompleteShell && onCompleteShell({
      write(v4) {
        !completed && buffer.write(v4);
      }
    });
    shellCompleted = true;
  }
  return {
    then(fn) {
      function complete() {
        dispose();
        fn(tmp);
      }
      if (onCompleteAll) {
        let ogComplete = onCompleteAll;
        onCompleteAll = (options2) => {
          ogComplete(options2);
          complete();
        };
      } else onCompleteAll = complete;
      queue(flushEnd);
    },
    pipe(w2) {
      allSettled(blockingPromises).then(() => {
        setTimeout(() => {
          doShell();
          buffer = writable = w2;
          buffer.write(tmp);
          firstFlushed = true;
          if (completed) {
            dispose();
            writable.end();
          } else flushEnd();
        });
      });
    },
    pipeTo(w2) {
      return allSettled(blockingPromises).then(() => {
        let resolve;
        const p2 = new Promise((r) => resolve = r);
        setTimeout(() => {
          doShell();
          const encoder = new TextEncoder();
          const writer = w2.getWriter();
          writable = {
            end() {
              writer.releaseLock();
              w2.close();
              resolve();
            }
          };
          buffer = {
            write(payload) {
              writer.write(encoder.encode(payload));
            }
          };
          buffer.write(tmp);
          firstFlushed = true;
          if (completed) {
            dispose();
            writable.end();
          } else flushEnd();
        });
        return p2;
      });
    }
  };
}
function HydrationScript(props) {
  const {
    nonce
  } = sharedConfig.context;
  return ssr(generateHydrationScript({
    nonce,
    ...props
  }));
}
function ssr(t, ...nodes) {
  if (nodes.length) {
    let result = "";
    for (let i2 = 0; i2 < nodes.length; i2++) {
      result += t[i2];
      const node = nodes[i2];
      if (node !== void 0) result += resolveSSRNode(node);
    }
    t = result + t[nodes.length];
  }
  return {
    t
  };
}
function ssrClassList(value) {
  if (!value) return "";
  let classKeys = Object.keys(value), result = "";
  for (let i2 = 0, len = classKeys.length; i2 < len; i2++) {
    const key = classKeys[i2], classValue = !!value[key];
    if (!key || key === "undefined" || !classValue) continue;
    i2 && (result += " ");
    result += escape(key);
  }
  return result;
}
function ssrStyle(value) {
  if (!value) return "";
  if (typeof value === "string") return escape(value, true);
  let result = "";
  const k2 = Object.keys(value);
  for (let i2 = 0; i2 < k2.length; i2++) {
    const s3 = k2[i2];
    const v4 = value[s3];
    if (v4 != void 0) {
      if (i2) result += ";";
      const r = escape(v4, true);
      if (r != void 0 && r !== "undefined") {
        result += `${s3}:${r}`;
      }
    }
  }
  return result;
}
function ssrStyleProperty(name, value) {
  return value != null ? name + value : "";
}
function ssrElement(tag, props, children2, needsId) {
  if (props == null) props = {};
  else if (typeof props === "function") props = props();
  const skipChildren = VOID_ELEMENTS.test(tag);
  const keys = Object.keys(props);
  let result = `<${tag}${ssrHydrationKey()} `;
  let classResolved;
  for (let i2 = 0; i2 < keys.length; i2++) {
    const prop = keys[i2];
    if (ChildProperties.has(prop)) {
      if (children2 === void 0 && !skipChildren) children2 = tag === "script" || tag === "style" || prop === "innerHTML" ? props[prop] : escape(props[prop]);
      continue;
    }
    const value = props[prop];
    if (prop === "style") {
      result += `style="${ssrStyle(value)}"`;
    } else if (prop === "class" || prop === "className" || prop === "classList") {
      if (classResolved) continue;
      let n;
      result += `class="${escape(((n = props.class) ? n + " " : "") + ((n = props.className) ? n + " " : ""), true) + ssrClassList(props.classList)}"`;
      classResolved = true;
    } else if (BooleanAttributes.has(prop)) {
      if (value) result += prop;
      else continue;
    } else if (value == void 0 || prop === "ref" || prop.slice(0, 2) === "on" || prop.slice(0, 5) === "prop:") {
      continue;
    } else if (prop.slice(0, 5) === "bool:") {
      if (!value) continue;
      result += escape(prop.slice(5));
    } else if (prop.slice(0, 5) === "attr:") {
      result += `${escape(prop.slice(5))}="${escape(value, true)}"`;
    } else {
      result += `${Aliases[prop] || escape(prop)}="${escape(value, true)}"`;
    }
    if (i2 !== keys.length - 1) result += " ";
  }
  if (skipChildren) return {
    t: result + "/>"
  };
  if (typeof children2 === "function") children2 = children2();
  return {
    t: result + `>${resolveSSRNode(children2, true)}</${tag}>`
  };
}
function ssrAttribute(key, value, isBoolean) {
  return value != null ? ` ${key}="${value}"` : "";
}
function ssrHydrationKey() {
  const hk = getHydrationKey();
  return hk ? ` data-hk=${hk}` : "";
}
function escape(s3, attr) {
  const t = typeof s3;
  if (t !== "string") {
    if (!attr && t === "function") return escape(s3());
    if (!attr && Array.isArray(s3)) {
      s3 = s3.slice();
      for (let i2 = 0; i2 < s3.length; i2++) s3[i2] = escape(s3[i2]);
      return s3;
    }
    if (attr && t === "boolean") return String(s3);
    return s3;
  }
  const delim = attr ? '"' : "<";
  const escDelim = attr ? "&quot;" : "&lt;";
  let iDelim = s3.indexOf(delim);
  let iAmp = s3.indexOf("&");
  if (iDelim < 0 && iAmp < 0) return s3;
  let left = 0, out = "";
  while (iDelim >= 0 && iAmp >= 0) {
    if (iDelim < iAmp) {
      if (left < iDelim) out += s3.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s3.indexOf(delim, left);
    } else {
      if (left < iAmp) out += s3.substring(left, iAmp);
      out += "&amp;";
      left = iAmp + 1;
      iAmp = s3.indexOf("&", left);
    }
  }
  if (iDelim >= 0) {
    do {
      if (left < iDelim) out += s3.substring(left, iDelim);
      out += escDelim;
      left = iDelim + 1;
      iDelim = s3.indexOf(delim, left);
    } while (iDelim >= 0);
  } else while (iAmp >= 0) {
    if (left < iAmp) out += s3.substring(left, iAmp);
    out += "&amp;";
    left = iAmp + 1;
    iAmp = s3.indexOf("&", left);
  }
  return left < s3.length ? out + s3.substring(left) : out;
}
function resolveSSRNode(node, top) {
  const t = typeof node;
  if (t === "string") return node;
  if (node == null || t === "boolean") return "";
  if (Array.isArray(node)) {
    let prev = {};
    let mapped = "";
    for (let i2 = 0, len = node.length; i2 < len; i2++) {
      if (!top && typeof prev !== "object" && typeof node[i2] !== "object") mapped += `<!--!$-->`;
      mapped += resolveSSRNode(prev = node[i2]);
    }
    return mapped;
  }
  if (t === "object") return node.t;
  if (t === "function") return resolveSSRNode(node());
  return String(node);
}
function getHydrationKey() {
  const hydrate = sharedConfig.context;
  return hydrate && !hydrate.noHydrate && sharedConfig.getNextContextId();
}
function useAssets(fn) {
  sharedConfig.context.assets.push(() => resolveSSRNode(escape(fn())));
}
function generateHydrationScript({
  eventNames = ["click", "input"],
  nonce
} = {}) {
  return `<script${nonce ? ` nonce="${nonce}"` : ""}>window._$HY||(e=>{let t=e=>e&&e.hasAttribute&&(e.hasAttribute("data-hk")?e:t(e.host&&e.host.nodeType?e.host:e.parentNode));["${eventNames.join('", "')}"].forEach((o=>document.addEventListener(o,(o=>{if(!e.events)return;let s=t(o.composedPath&&o.composedPath()[0]||o.target);s&&!e.completed.has(s)&&e.events.push([s,o])}))))})(_$HY={events:[],completed:new WeakSet,r:{},fe(){}});<\/script><!--xs-->`;
}
function Hydration(props) {
  if (!sharedConfig.context.noHydrate) return props.children;
  const context = sharedConfig.context;
  sharedConfig.context = {
    ...context,
    count: 0,
    id: sharedConfig.getNextContextId(),
    noHydrate: false
  };
  const res = props.children;
  sharedConfig.context = context;
  return res;
}
function NoHydration(props) {
  if (sharedConfig.context) sharedConfig.context.noHydrate = true;
  return props.children;
}
function queue(fn) {
  return Promise.resolve().then(fn);
}
function allSettled(promises) {
  let length = promises.length;
  return Promise.allSettled(promises).then(() => {
    if (promises.length !== length) return allSettled(promises);
    return;
  });
}
function injectAssets(assets, html) {
  if (!assets || !assets.length) return html;
  let out = "";
  for (let i2 = 0, len = assets.length; i2 < len; i2++) out += assets[i2]();
  const index = html.indexOf("</head>");
  if (index === -1) return html;
  return html.slice(0, index) + out + html.slice(index);
}
function injectScripts(html, scripts, nonce) {
  const tag = `<script${nonce ? ` nonce="${nonce}"` : ""}>${scripts}<\/script>`;
  const index = html.indexOf("<!--xs-->");
  if (index > -1) {
    return html.slice(0, index) + tag + html.slice(index);
  }
  return html + tag;
}
function waitForFragments(registry, key) {
  for (const k2 of [...registry.keys()].reverse()) {
    if (key.startsWith(k2)) return true;
  }
  return false;
}
function replacePlaceholder(html, key, value) {
  const marker = `<template id="pl-${key}">`;
  const close = `<!--pl-${key}-->`;
  const first = html.indexOf(marker);
  if (first === -1) return html;
  const last2 = html.indexOf(close, first + marker.length);
  return html.slice(0, first) + value + html.slice(last2 + close.length);
}
function createDynamic(component, props) {
  const comp = component(), t = typeof comp;
  if (comp) {
    if (t === "function") return comp(props);
    else if (t === "string") {
      return ssrElement(comp, props, void 0);
    }
  }
}
function Dynamic(props) {
  const [, others] = splitProps(props, ["component"]);
  return createDynamic(() => props.component, others);
}
const __storeToDerived = /* @__PURE__ */ new WeakMap();
const __derivedToStore = /* @__PURE__ */ new WeakMap();
const __depsThatHaveWrittenThisTick = {
  current: []
};
let __isFlushing = false;
let __batchDepth = 0;
const __pendingUpdates = /* @__PURE__ */ new Set();
const __initialBatchValues = /* @__PURE__ */ new Map();
function __flush_internals(relatedVals) {
  const sorted = Array.from(relatedVals).sort((a, b) => {
    if (a instanceof Derived && a.options.deps.includes(b)) return 1;
    if (b instanceof Derived && b.options.deps.includes(a)) return -1;
    return 0;
  });
  for (const derived of sorted) {
    if (__depsThatHaveWrittenThisTick.current.includes(derived)) {
      continue;
    }
    __depsThatHaveWrittenThisTick.current.push(derived);
    derived.recompute();
    const stores = __derivedToStore.get(derived);
    if (stores) {
      for (const store of stores) {
        const relatedLinkedDerivedVals = __storeToDerived.get(store);
        if (!relatedLinkedDerivedVals) continue;
        __flush_internals(relatedLinkedDerivedVals);
      }
    }
  }
}
function __notifyListeners(store) {
  store.listeners.forEach(
    (listener) => listener({
      prevVal: store.prevState,
      currentVal: store.state
    })
  );
}
function __notifyDerivedListeners(derived) {
  derived.listeners.forEach(
    (listener) => listener({
      prevVal: derived.prevState,
      currentVal: derived.state
    })
  );
}
function __flush(store) {
  if (__batchDepth > 0 && !__initialBatchValues.has(store)) {
    __initialBatchValues.set(store, store.prevState);
  }
  __pendingUpdates.add(store);
  if (__batchDepth > 0) return;
  if (__isFlushing) return;
  try {
    __isFlushing = true;
    while (__pendingUpdates.size > 0) {
      const stores = Array.from(__pendingUpdates);
      __pendingUpdates.clear();
      for (const store2 of stores) {
        const prevState = __initialBatchValues.get(store2) ?? store2.prevState;
        store2.prevState = prevState;
        __notifyListeners(store2);
      }
      for (const store2 of stores) {
        const derivedVals = __storeToDerived.get(store2);
        if (!derivedVals) continue;
        __depsThatHaveWrittenThisTick.current.push(store2);
        __flush_internals(derivedVals);
      }
      for (const store2 of stores) {
        const derivedVals = __storeToDerived.get(store2);
        if (!derivedVals) continue;
        for (const derived of derivedVals) {
          __notifyDerivedListeners(derived);
        }
      }
    }
  } finally {
    __isFlushing = false;
    __depsThatHaveWrittenThisTick.current = [];
    __initialBatchValues.clear();
  }
}
function batch(fn) {
  __batchDepth++;
  try {
    fn();
  } finally {
    __batchDepth--;
    if (__batchDepth === 0) {
      const pendingUpdateToFlush = Array.from(__pendingUpdates)[0];
      if (pendingUpdateToFlush) {
        __flush(pendingUpdateToFlush);
      }
    }
  }
}
class Store {
  constructor(initialState, options) {
    this.listeners = /* @__PURE__ */ new Set();
    this.subscribe = (listener) => {
      var _a, _b;
      this.listeners.add(listener);
      const unsub = (_b = (_a = this.options) == null ? void 0 : _a.onSubscribe) == null ? void 0 : _b.call(_a, listener, this);
      return () => {
        this.listeners.delete(listener);
        unsub == null ? void 0 : unsub();
      };
    };
    this.setState = (updater) => {
      var _a, _b, _c;
      this.prevState = this.state;
      this.state = ((_a = this.options) == null ? void 0 : _a.updateFn) ? this.options.updateFn(this.prevState)(updater) : updater(this.prevState);
      (_c = (_b = this.options) == null ? void 0 : _b.onUpdate) == null ? void 0 : _c.call(_b);
      __flush(this);
    };
    this.prevState = initialState;
    this.state = initialState;
    this.options = options;
  }
}
class Derived {
  constructor(options) {
    this.listeners = /* @__PURE__ */ new Set();
    this._subscriptions = [];
    this.lastSeenDepValues = [];
    this.getDepVals = () => {
      const prevDepVals = [];
      const currDepVals = [];
      for (const dep of this.options.deps) {
        prevDepVals.push(dep.prevState);
        currDepVals.push(dep.state);
      }
      this.lastSeenDepValues = currDepVals;
      return {
        prevDepVals,
        currDepVals,
        prevVal: this.prevState ?? void 0
      };
    };
    this.recompute = () => {
      var _a, _b;
      this.prevState = this.state;
      const { prevDepVals, currDepVals, prevVal } = this.getDepVals();
      this.state = this.options.fn({
        prevDepVals,
        currDepVals,
        prevVal
      });
      (_b = (_a = this.options).onUpdate) == null ? void 0 : _b.call(_a);
    };
    this.checkIfRecalculationNeededDeeply = () => {
      for (const dep of this.options.deps) {
        if (dep instanceof Derived) {
          dep.checkIfRecalculationNeededDeeply();
        }
      }
      let shouldRecompute = false;
      const lastSeenDepValues = this.lastSeenDepValues;
      const { currDepVals } = this.getDepVals();
      for (let i2 = 0; i2 < currDepVals.length; i2++) {
        if (currDepVals[i2] !== lastSeenDepValues[i2]) {
          shouldRecompute = true;
          break;
        }
      }
      if (shouldRecompute) {
        this.recompute();
      }
    };
    this.mount = () => {
      this.registerOnGraph();
      this.checkIfRecalculationNeededDeeply();
      return () => {
        this.unregisterFromGraph();
        for (const cleanup of this._subscriptions) {
          cleanup();
        }
      };
    };
    this.subscribe = (listener) => {
      var _a, _b;
      this.listeners.add(listener);
      const unsub = (_b = (_a = this.options).onSubscribe) == null ? void 0 : _b.call(_a, listener, this);
      return () => {
        this.listeners.delete(listener);
        unsub == null ? void 0 : unsub();
      };
    };
    this.options = options;
    this.state = options.fn({
      prevDepVals: void 0,
      prevVal: void 0,
      currDepVals: this.getDepVals().currDepVals
    });
  }
  registerOnGraph(deps = this.options.deps) {
    for (const dep of deps) {
      if (dep instanceof Derived) {
        dep.registerOnGraph();
        this.registerOnGraph(dep.options.deps);
      } else if (dep instanceof Store) {
        let relatedLinkedDerivedVals = __storeToDerived.get(dep);
        if (!relatedLinkedDerivedVals) {
          relatedLinkedDerivedVals = /* @__PURE__ */ new Set();
          __storeToDerived.set(dep, relatedLinkedDerivedVals);
        }
        relatedLinkedDerivedVals.add(this);
        let relatedStores = __derivedToStore.get(this);
        if (!relatedStores) {
          relatedStores = /* @__PURE__ */ new Set();
          __derivedToStore.set(this, relatedStores);
        }
        relatedStores.add(dep);
      }
    }
  }
  unregisterFromGraph(deps = this.options.deps) {
    for (const dep of deps) {
      if (dep instanceof Derived) {
        this.unregisterFromGraph(dep.options.deps);
      } else if (dep instanceof Store) {
        const relatedLinkedDerivedVals = __storeToDerived.get(dep);
        if (relatedLinkedDerivedVals) {
          relatedLinkedDerivedVals.delete(this);
        }
        const relatedStores = __derivedToStore.get(this);
        if (relatedStores) {
          relatedStores.delete(dep);
        }
      }
    }
  }
}
const stateIndexKey = "__TSR_index";
const popStateEvent = "popstate";
const beforeUnloadEvent = "beforeunload";
function createHistory(opts) {
  let location = opts.getLocation();
  const subscribers = /* @__PURE__ */ new Set();
  const notify = (action) => {
    location = opts.getLocation();
    subscribers.forEach((subscriber) => subscriber({ location, action }));
  };
  const handleIndexChange = (action) => {
    if (opts.notifyOnIndexChange ?? true) notify(action);
    else location = opts.getLocation();
  };
  const tryNavigation = async ({
    task,
    navigateOpts,
    ...actionInfo
  }) => {
    const ignoreBlocker = navigateOpts?.ignoreBlocker ?? false;
    if (ignoreBlocker) {
      task();
      return;
    }
    const blockers = opts.getBlockers?.() ?? [];
    const isPushOrReplace = actionInfo.type === "PUSH" || actionInfo.type === "REPLACE";
    if (typeof document !== "undefined" && blockers.length && isPushOrReplace) {
      for (const blocker of blockers) {
        const nextLocation = parseHref(actionInfo.path, actionInfo.state);
        const isBlocked = await blocker.blockerFn({
          currentLocation: location,
          nextLocation,
          action: actionInfo.type
        });
        if (isBlocked) {
          opts.onBlocked?.();
          return;
        }
      }
    }
    task();
  };
  return {
    get location() {
      return location;
    },
    get length() {
      return opts.getLength();
    },
    subscribers,
    subscribe: (cb) => {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },
    push: (path, state, navigateOpts) => {
      const currentIndex = location.state[stateIndexKey];
      state = assignKeyAndIndex(currentIndex + 1, state);
      tryNavigation({
        task: () => {
          opts.pushState(path, state);
          notify({ type: "PUSH" });
        },
        navigateOpts,
        type: "PUSH",
        path,
        state
      });
    },
    replace: (path, state, navigateOpts) => {
      const currentIndex = location.state[stateIndexKey];
      state = assignKeyAndIndex(currentIndex, state);
      tryNavigation({
        task: () => {
          opts.replaceState(path, state);
          notify({ type: "REPLACE" });
        },
        navigateOpts,
        type: "REPLACE",
        path,
        state
      });
    },
    go: (index, navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.go(index);
          handleIndexChange({ type: "GO", index });
        },
        navigateOpts,
        type: "GO"
      });
    },
    back: (navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.back(navigateOpts?.ignoreBlocker ?? false);
          handleIndexChange({ type: "BACK" });
        },
        navigateOpts,
        type: "BACK"
      });
    },
    forward: (navigateOpts) => {
      tryNavigation({
        task: () => {
          opts.forward(navigateOpts?.ignoreBlocker ?? false);
          handleIndexChange({ type: "FORWARD" });
        },
        navigateOpts,
        type: "FORWARD"
      });
    },
    canGoBack: () => location.state[stateIndexKey] !== 0,
    createHref: (str) => opts.createHref(str),
    block: (blocker) => {
      if (!opts.setBlockers) return () => {
      };
      const blockers = opts.getBlockers?.() ?? [];
      opts.setBlockers([...blockers, blocker]);
      return () => {
        const blockers2 = opts.getBlockers?.() ?? [];
        opts.setBlockers?.(blockers2.filter((b) => b !== blocker));
      };
    },
    flush: () => opts.flush?.(),
    destroy: () => opts.destroy?.(),
    notify
  };
}
function assignKeyAndIndex(index, state) {
  if (!state) {
    state = {};
  }
  const key = createRandomKey();
  return {
    ...state,
    key,
    // TODO: Remove in v2 - use __TSR_key instead
    __TSR_key: key,
    [stateIndexKey]: index
  };
}
function createBrowserHistory(opts) {
  const win = typeof document !== "undefined" ? window : void 0;
  const originalPushState = win.history.pushState;
  const originalReplaceState = win.history.replaceState;
  let blockers = [];
  const _getBlockers = () => blockers;
  const _setBlockers = (newBlockers) => blockers = newBlockers;
  const createHref = (path) => path;
  const parseLocation = () => parseHref(
    `${win.location.pathname}${win.location.search}${win.location.hash}`,
    win.history.state
  );
  if (!win.history.state?.__TSR_key && !win.history.state?.key) {
    const addedKey = createRandomKey();
    win.history.replaceState(
      {
        [stateIndexKey]: 0,
        key: addedKey,
        // TODO: Remove in v2 - use __TSR_key instead
        __TSR_key: addedKey
      },
      ""
    );
  }
  let currentLocation = parseLocation();
  let rollbackLocation;
  let nextPopIsGo = false;
  let ignoreNextPop = false;
  let skipBlockerNextPop = false;
  let ignoreNextBeforeUnload = false;
  const getLocation = () => currentLocation;
  let next;
  let scheduled;
  const flush = () => {
    if (!next) {
      return;
    }
    history._ignoreSubscribers = true;
    (next.isPush ? win.history.pushState : win.history.replaceState)(
      next.state,
      "",
      next.href
    );
    history._ignoreSubscribers = false;
    next = void 0;
    scheduled = void 0;
    rollbackLocation = void 0;
  };
  const queueHistoryAction = (type, destHref, state) => {
    const href = createHref(destHref);
    if (!scheduled) {
      rollbackLocation = currentLocation;
    }
    currentLocation = parseHref(destHref, state);
    next = {
      href,
      state,
      isPush: next?.isPush || type === "push"
    };
    if (!scheduled) {
      scheduled = Promise.resolve().then(() => flush());
    }
  };
  const onPushPop = (type) => {
    currentLocation = parseLocation();
    history.notify({ type });
  };
  const onPushPopEvent = async () => {
    if (ignoreNextPop) {
      ignoreNextPop = false;
      return;
    }
    const nextLocation = parseLocation();
    const delta = nextLocation.state[stateIndexKey] - currentLocation.state[stateIndexKey];
    const isForward = delta === 1;
    const isBack = delta === -1;
    const isGo = !isForward && !isBack || nextPopIsGo;
    nextPopIsGo = false;
    const action = isGo ? "GO" : isBack ? "BACK" : "FORWARD";
    const notify = isGo ? {
      type: "GO",
      index: delta
    } : {
      type: isBack ? "BACK" : "FORWARD"
    };
    if (skipBlockerNextPop) {
      skipBlockerNextPop = false;
    } else {
      const blockers2 = _getBlockers();
      if (typeof document !== "undefined" && blockers2.length) {
        for (const blocker of blockers2) {
          const isBlocked = await blocker.blockerFn({
            currentLocation,
            nextLocation,
            action
          });
          if (isBlocked) {
            ignoreNextPop = true;
            win.history.go(1);
            history.notify(notify);
            return;
          }
        }
      }
    }
    currentLocation = parseLocation();
    history.notify(notify);
  };
  const onBeforeUnload = (e) => {
    if (ignoreNextBeforeUnload) {
      ignoreNextBeforeUnload = false;
      return;
    }
    let shouldBlock = false;
    const blockers2 = _getBlockers();
    if (typeof document !== "undefined" && blockers2.length) {
      for (const blocker of blockers2) {
        const shouldHaveBeforeUnload = blocker.enableBeforeUnload ?? true;
        if (shouldHaveBeforeUnload === true) {
          shouldBlock = true;
          break;
        }
        if (typeof shouldHaveBeforeUnload === "function" && shouldHaveBeforeUnload() === true) {
          shouldBlock = true;
          break;
        }
      }
    }
    if (shouldBlock) {
      e.preventDefault();
      return e.returnValue = "";
    }
    return;
  };
  const history = createHistory({
    getLocation,
    getLength: () => win.history.length,
    pushState: (href, state) => queueHistoryAction("push", href, state),
    replaceState: (href, state) => queueHistoryAction("replace", href, state),
    back: (ignoreBlocker) => {
      if (ignoreBlocker) skipBlockerNextPop = true;
      ignoreNextBeforeUnload = true;
      return win.history.back();
    },
    forward: (ignoreBlocker) => {
      if (ignoreBlocker) skipBlockerNextPop = true;
      ignoreNextBeforeUnload = true;
      win.history.forward();
    },
    go: (n) => {
      nextPopIsGo = true;
      win.history.go(n);
    },
    createHref: (href) => createHref(href),
    flush,
    destroy: () => {
      win.history.pushState = originalPushState;
      win.history.replaceState = originalReplaceState;
      win.removeEventListener(beforeUnloadEvent, onBeforeUnload, {
        capture: true
      });
      win.removeEventListener(popStateEvent, onPushPopEvent);
    },
    onBlocked: () => {
      if (rollbackLocation && currentLocation !== rollbackLocation) {
        currentLocation = rollbackLocation;
      }
    },
    getBlockers: _getBlockers,
    setBlockers: _setBlockers,
    notifyOnIndexChange: false
  });
  win.addEventListener(beforeUnloadEvent, onBeforeUnload, { capture: true });
  win.addEventListener(popStateEvent, onPushPopEvent);
  win.history.pushState = function(...args) {
    const res = originalPushState.apply(win.history, args);
    if (!history._ignoreSubscribers) onPushPop("PUSH");
    return res;
  };
  win.history.replaceState = function(...args) {
    const res = originalReplaceState.apply(win.history, args);
    if (!history._ignoreSubscribers) onPushPop("REPLACE");
    return res;
  };
  return history;
}
function createMemoryHistory(opts = {
  initialEntries: ["/"]
}) {
  const entries = opts.initialEntries;
  let index = opts.initialIndex ? Math.min(Math.max(opts.initialIndex, 0), entries.length - 1) : entries.length - 1;
  const states = entries.map(
    (_entry, index2) => assignKeyAndIndex(index2, void 0)
  );
  const getLocation = () => parseHref(entries[index], states[index]);
  return createHistory({
    getLocation,
    getLength: () => entries.length,
    pushState: (path, state) => {
      if (index < entries.length - 1) {
        entries.splice(index + 1);
        states.splice(index + 1);
      }
      states.push(state);
      entries.push(path);
      index = Math.max(entries.length - 1, 0);
    },
    replaceState: (path, state) => {
      states[index] = state;
      entries[index] = path;
    },
    back: () => {
      index = Math.max(index - 1, 0);
    },
    forward: () => {
      index = Math.min(index + 1, entries.length - 1);
    },
    go: (n) => {
      index = Math.min(Math.max(index + n, 0), entries.length - 1);
    },
    createHref: (path) => path
  });
}
function parseHref(href, state) {
  const hashIndex = href.indexOf("#");
  const searchIndex = href.indexOf("?");
  const addedKey = createRandomKey();
  return {
    href,
    pathname: href.substring(
      0,
      hashIndex > 0 ? searchIndex > 0 ? Math.min(hashIndex, searchIndex) : hashIndex : searchIndex > 0 ? searchIndex : href.length
    ),
    hash: hashIndex > -1 ? href.substring(hashIndex) : "",
    search: searchIndex > -1 ? href.slice(searchIndex, hashIndex === -1 ? void 0 : hashIndex) : "",
    state: state || { [stateIndexKey]: 0, key: addedKey, __TSR_key: addedKey }
  };
}
function createRandomKey() {
  return (Math.random() + 1).toString(36).substring(7);
}
function last(arr) {
  return arr[arr.length - 1];
}
function isFunction(d2) {
  return typeof d2 === "function";
}
function functionalUpdate(updater, previous) {
  if (isFunction(updater)) {
    return updater(previous);
  }
  return updater;
}
const hasOwn = Object.prototype.hasOwnProperty;
function replaceEqualDeep(prev, _next) {
  if (prev === _next) {
    return prev;
  }
  const next = _next;
  const array = isPlainArray(prev) && isPlainArray(next);
  if (!array && !(isPlainObject(prev) && isPlainObject(next))) return next;
  const prevItems = array ? prev : getEnumerableOwnKeys(prev);
  if (!prevItems) return next;
  const nextItems = array ? next : getEnumerableOwnKeys(next);
  if (!nextItems) return next;
  const prevSize = prevItems.length;
  const nextSize = nextItems.length;
  const copy = array ? new Array(nextSize) : {};
  let equalItems = 0;
  for (let i2 = 0; i2 < nextSize; i2++) {
    const key = array ? i2 : nextItems[i2];
    const p2 = prev[key];
    const n = next[key];
    if (p2 === n) {
      copy[key] = p2;
      if (array ? i2 < prevSize : hasOwn.call(prev, key)) equalItems++;
      continue;
    }
    if (p2 === null || n === null || typeof p2 !== "object" || typeof n !== "object") {
      copy[key] = n;
      continue;
    }
    const v4 = replaceEqualDeep(p2, n);
    copy[key] = v4;
    if (v4 === p2) equalItems++;
  }
  return prevSize === nextSize && equalItems === prevSize ? prev : copy;
}
function getEnumerableOwnKeys(o2) {
  const keys = [];
  const names = Object.getOwnPropertyNames(o2);
  for (const name of names) {
    if (!Object.prototype.propertyIsEnumerable.call(o2, name)) return false;
    keys.push(name);
  }
  const symbols = Object.getOwnPropertySymbols(o2);
  for (const symbol of symbols) {
    if (!Object.prototype.propertyIsEnumerable.call(o2, symbol)) return false;
    keys.push(symbol);
  }
  return keys;
}
function isPlainObject(o2) {
  if (!hasObjectPrototype(o2)) {
    return false;
  }
  const ctor = o2.constructor;
  if (typeof ctor === "undefined") {
    return true;
  }
  const prot = ctor.prototype;
  if (!hasObjectPrototype(prot)) {
    return false;
  }
  if (!prot.hasOwnProperty("isPrototypeOf")) {
    return false;
  }
  return true;
}
function hasObjectPrototype(o2) {
  return Object.prototype.toString.call(o2) === "[object Object]";
}
function isPlainArray(value) {
  return Array.isArray(value) && value.length === Object.keys(value).length;
}
function deepEqual(a, b, opts) {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i2 = 0, l2 = a.length; i2 < l2; i2++) {
      if (!deepEqual(a[i2], b[i2], opts)) return false;
    }
    return true;
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const ignoreUndefined = opts?.ignoreUndefined ?? true;
    if (opts?.partial) {
      for (const k2 in b) {
        if (!ignoreUndefined || b[k2] !== void 0) {
          if (!deepEqual(a[k2], b[k2], opts)) return false;
        }
      }
      return true;
    }
    let aCount = 0;
    if (!ignoreUndefined) {
      aCount = Object.keys(a).length;
    } else {
      for (const k2 in a) {
        if (a[k2] !== void 0) aCount++;
      }
    }
    let bCount = 0;
    for (const k2 in b) {
      if (!ignoreUndefined || b[k2] !== void 0) {
        bCount++;
        if (bCount > aCount || !deepEqual(a[k2], b[k2], opts)) return false;
      }
    }
    return aCount === bCount;
  }
  return false;
}
function createControlledPromise(onResolve) {
  let resolveLoadPromise;
  let rejectLoadPromise;
  const controlledPromise = new Promise((resolve, reject) => {
    resolveLoadPromise = resolve;
    rejectLoadPromise = reject;
  });
  controlledPromise.status = "pending";
  controlledPromise.resolve = (value) => {
    controlledPromise.status = "resolved";
    controlledPromise.value = value;
    resolveLoadPromise(value);
    onResolve?.(value);
  };
  controlledPromise.reject = (e) => {
    controlledPromise.status = "rejected";
    rejectLoadPromise(e);
  };
  return controlledPromise;
}
function isModuleNotFoundError(error) {
  if (typeof error?.message !== "string") return false;
  return error.message.startsWith("Failed to fetch dynamically imported module") || error.message.startsWith("error loading dynamically imported module") || error.message.startsWith("Importing a module script failed");
}
function isPromise(value) {
  return Boolean(
    value && typeof value === "object" && typeof value.then === "function"
  );
}
var prefix = "Invariant failed";
function invariant(condition, message) {
  if (condition) {
    return;
  }
  {
    throw new Error(prefix);
  }
}
const rootRouteId = "__root__";
const SEGMENT_TYPE_PATHNAME = 0;
const SEGMENT_TYPE_PARAM = 1;
const SEGMENT_TYPE_WILDCARD = 2;
const SEGMENT_TYPE_OPTIONAL_PARAM = 3;
function joinPaths(paths) {
  return cleanPath(
    paths.filter((val) => {
      return val !== void 0;
    }).join("/")
  );
}
function cleanPath(path) {
  return path.replace(/\/{2,}/g, "/");
}
function trimPathLeft(path) {
  return path === "/" ? path : path.replace(/^\/{1,}/, "");
}
function trimPathRight(path) {
  return path === "/" ? path : path.replace(/\/{1,}$/, "");
}
function trimPath(path) {
  return trimPathRight(trimPathLeft(path));
}
function removeTrailingSlash(value, basepath) {
  if (value?.endsWith("/") && value !== "/" && value !== `${basepath}/`) {
    return value.slice(0, -1);
  }
  return value;
}
function exactPathTest(pathName1, pathName2, basepath) {
  return removeTrailingSlash(pathName1, basepath) === removeTrailingSlash(pathName2, basepath);
}
function segmentToString(segment) {
  const { type, value } = segment;
  if (type === SEGMENT_TYPE_PATHNAME) {
    return value;
  }
  const { prefixSegment, suffixSegment } = segment;
  if (type === SEGMENT_TYPE_PARAM) {
    const param = value.substring(1);
    if (prefixSegment && suffixSegment) {
      return `${prefixSegment}{$${param}}${suffixSegment}`;
    } else if (prefixSegment) {
      return `${prefixSegment}{$${param}}`;
    } else if (suffixSegment) {
      return `{$${param}}${suffixSegment}`;
    }
  }
  if (type === SEGMENT_TYPE_OPTIONAL_PARAM) {
    const param = value.substring(1);
    if (prefixSegment && suffixSegment) {
      return `${prefixSegment}{-$${param}}${suffixSegment}`;
    } else if (prefixSegment) {
      return `${prefixSegment}{-$${param}}`;
    } else if (suffixSegment) {
      return `{-$${param}}${suffixSegment}`;
    }
    return `{-$${param}}`;
  }
  if (type === SEGMENT_TYPE_WILDCARD) {
    if (prefixSegment && suffixSegment) {
      return `${prefixSegment}{$}${suffixSegment}`;
    } else if (prefixSegment) {
      return `${prefixSegment}{$}`;
    } else if (suffixSegment) {
      return `{$}${suffixSegment}`;
    }
  }
  return value;
}
function resolvePath({
  base,
  to,
  trailingSlash = "never",
  parseCache
}) {
  let baseSegments = parseBasePathSegments(base, parseCache).slice();
  const toSegments = parseRoutePathSegments(to, parseCache);
  if (baseSegments.length > 1 && last(baseSegments)?.value === "/") {
    baseSegments.pop();
  }
  for (let index = 0, length = toSegments.length; index < length; index++) {
    const toSegment = toSegments[index];
    const value = toSegment.value;
    if (value === "/") {
      if (!index) {
        baseSegments = [toSegment];
      } else if (index === length - 1) {
        baseSegments.push(toSegment);
      } else ;
    } else if (value === "..") {
      baseSegments.pop();
    } else if (value === ".") ;
    else {
      baseSegments.push(toSegment);
    }
  }
  if (baseSegments.length > 1) {
    if (last(baseSegments).value === "/") {
      if (trailingSlash === "never") {
        baseSegments.pop();
      }
    } else if (trailingSlash === "always") {
      baseSegments.push({ type: SEGMENT_TYPE_PATHNAME, value: "/" });
    }
  }
  const segmentValues = baseSegments.map(segmentToString);
  const joined = joinPaths(segmentValues);
  return joined;
}
const parseBasePathSegments = (pathname, cache) => parsePathname(pathname, cache, true);
const parseRoutePathSegments = (pathname, cache) => parsePathname(pathname, cache, false);
const parsePathname = (pathname, cache, basePathValues) => {
  if (!pathname) return [];
  const cached = cache?.get(pathname);
  if (cached) return cached;
  const parsed = baseParsePathname(pathname, basePathValues);
  cache?.set(pathname, parsed);
  return parsed;
};
const PARAM_RE = /^\$.{1,}$/;
const PARAM_W_CURLY_BRACES_RE = /^(.*?)\{(\$[a-zA-Z_$][a-zA-Z0-9_$]*)\}(.*)$/;
const OPTIONAL_PARAM_W_CURLY_BRACES_RE = /^(.*?)\{-(\$[a-zA-Z_$][a-zA-Z0-9_$]*)\}(.*)$/;
const WILDCARD_RE = /^\$$/;
const WILDCARD_W_CURLY_BRACES_RE = /^(.*?)\{\$\}(.*)$/;
function baseParsePathname(pathname, basePathValues) {
  pathname = cleanPath(pathname);
  const segments = [];
  if (pathname.slice(0, 1) === "/") {
    pathname = pathname.substring(1);
    segments.push({
      type: SEGMENT_TYPE_PATHNAME,
      value: "/"
    });
  }
  if (!pathname) {
    return segments;
  }
  const split = pathname.split("/").filter(Boolean);
  segments.push(
    ...split.map((part) => {
      const partToMatch = !basePathValues && part !== rootRouteId && part.slice(-1) === "_" ? part.slice(0, -1) : part;
      const wildcardBracesMatch = partToMatch.match(WILDCARD_W_CURLY_BRACES_RE);
      if (wildcardBracesMatch) {
        const prefix2 = wildcardBracesMatch[1];
        const suffix = wildcardBracesMatch[2];
        return {
          type: SEGMENT_TYPE_WILDCARD,
          value: "$",
          prefixSegment: prefix2 || void 0,
          suffixSegment: suffix || void 0
        };
      }
      const optionalParamBracesMatch = partToMatch.match(
        OPTIONAL_PARAM_W_CURLY_BRACES_RE
      );
      if (optionalParamBracesMatch) {
        const prefix2 = optionalParamBracesMatch[1];
        const paramName = optionalParamBracesMatch[2];
        const suffix = optionalParamBracesMatch[3];
        return {
          type: SEGMENT_TYPE_OPTIONAL_PARAM,
          value: paramName,
          // Now just $paramName (no prefix)
          prefixSegment: prefix2 || void 0,
          suffixSegment: suffix || void 0
        };
      }
      const paramBracesMatch = partToMatch.match(PARAM_W_CURLY_BRACES_RE);
      if (paramBracesMatch) {
        const prefix2 = paramBracesMatch[1];
        const paramName = paramBracesMatch[2];
        const suffix = paramBracesMatch[3];
        return {
          type: SEGMENT_TYPE_PARAM,
          value: "" + paramName,
          prefixSegment: prefix2 || void 0,
          suffixSegment: suffix || void 0
        };
      }
      if (PARAM_RE.test(partToMatch)) {
        const paramName = partToMatch.substring(1);
        return {
          type: SEGMENT_TYPE_PARAM,
          value: "$" + paramName,
          prefixSegment: void 0,
          suffixSegment: void 0
        };
      }
      if (WILDCARD_RE.test(partToMatch)) {
        return {
          type: SEGMENT_TYPE_WILDCARD,
          value: "$",
          prefixSegment: void 0,
          suffixSegment: void 0
        };
      }
      return {
        type: SEGMENT_TYPE_PATHNAME,
        value: partToMatch.includes("%25") ? partToMatch.split("%25").map((segment) => decodeURI(segment)).join("%25") : decodeURI(partToMatch)
      };
    })
  );
  if (pathname.slice(-1) === "/") {
    pathname = pathname.substring(1);
    segments.push({
      type: SEGMENT_TYPE_PATHNAME,
      value: "/"
    });
  }
  return segments;
}
function interpolatePath({
  path,
  params,
  leaveWildcards,
  leaveParams,
  decodeCharMap,
  parseCache
}) {
  const interpolatedPathSegments = parseRoutePathSegments(path, parseCache);
  function encodeParam(key) {
    const value = params[key];
    const isValueString = typeof value === "string";
    if (key === "*" || key === "_splat") {
      return isValueString ? encodeURI(value) : value;
    } else {
      return isValueString ? encodePathParam(value, decodeCharMap) : value;
    }
  }
  let isMissingParams = false;
  const usedParams = {};
  const interpolatedPath = joinPaths(
    interpolatedPathSegments.map((segment) => {
      if (segment.type === SEGMENT_TYPE_PATHNAME) {
        return segment.value;
      }
      if (segment.type === SEGMENT_TYPE_WILDCARD) {
        usedParams._splat = params._splat;
        usedParams["*"] = params._splat;
        const segmentPrefix = segment.prefixSegment || "";
        const segmentSuffix = segment.suffixSegment || "";
        if (!("_splat" in params)) {
          isMissingParams = true;
          if (leaveWildcards) {
            return `${segmentPrefix}${segment.value}${segmentSuffix}`;
          }
          if (segmentPrefix || segmentSuffix) {
            return `${segmentPrefix}${segmentSuffix}`;
          }
          return void 0;
        }
        const value = encodeParam("_splat");
        if (leaveWildcards) {
          return `${segmentPrefix}${segment.value}${value ?? ""}${segmentSuffix}`;
        }
        return `${segmentPrefix}${value}${segmentSuffix}`;
      }
      if (segment.type === SEGMENT_TYPE_PARAM) {
        const key = segment.value.substring(1);
        if (!isMissingParams && !(key in params)) {
          isMissingParams = true;
        }
        usedParams[key] = params[key];
        const segmentPrefix = segment.prefixSegment || "";
        const segmentSuffix = segment.suffixSegment || "";
        if (leaveParams) {
          const value = encodeParam(segment.value);
          return `${segmentPrefix}${segment.value}${value ?? ""}${segmentSuffix}`;
        }
        return `${segmentPrefix}${encodeParam(key) ?? "undefined"}${segmentSuffix}`;
      }
      if (segment.type === SEGMENT_TYPE_OPTIONAL_PARAM) {
        const key = segment.value.substring(1);
        const segmentPrefix = segment.prefixSegment || "";
        const segmentSuffix = segment.suffixSegment || "";
        if (!(key in params) || params[key] == null) {
          if (leaveWildcards) {
            return `${segmentPrefix}${key}${segmentSuffix}`;
          }
          if (segmentPrefix || segmentSuffix) {
            return `${segmentPrefix}${segmentSuffix}`;
          }
          return void 0;
        }
        usedParams[key] = params[key];
        if (leaveParams) {
          const value = encodeParam(segment.value);
          return `${segmentPrefix}${segment.value}${value ?? ""}${segmentSuffix}`;
        }
        if (leaveWildcards) {
          return `${segmentPrefix}${key}${encodeParam(key) ?? ""}${segmentSuffix}`;
        }
        return `${segmentPrefix}${encodeParam(key) ?? ""}${segmentSuffix}`;
      }
      return segment.value;
    })
  );
  return { usedParams, interpolatedPath, isMissingParams };
}
function encodePathParam(value, decodeCharMap) {
  let encoded = encodeURIComponent(value);
  if (decodeCharMap) {
    for (const [encodedChar, char] of decodeCharMap) {
      encoded = encoded.replaceAll(encodedChar, char);
    }
  }
  return encoded;
}
function matchPathname(currentPathname, matchLocation, parseCache) {
  const pathParams = matchByPath(currentPathname, matchLocation, parseCache);
  if (matchLocation.to && !pathParams) {
    return;
  }
  return pathParams ?? {};
}
function matchByPath(from, {
  to,
  fuzzy,
  caseSensitive
}, parseCache) {
  const stringTo = to;
  const baseSegments = parseBasePathSegments(
    from.startsWith("/") ? from : `/${from}`,
    parseCache
  );
  const routeSegments = parseRoutePathSegments(
    stringTo.startsWith("/") ? stringTo : `/${stringTo}`,
    parseCache
  );
  const params = {};
  const result = isMatch(
    baseSegments,
    routeSegments,
    params,
    fuzzy,
    caseSensitive
  );
  return result ? params : void 0;
}
function isMatch(baseSegments, routeSegments, params, fuzzy, caseSensitive) {
  let baseIndex = 0;
  let routeIndex = 0;
  while (baseIndex < baseSegments.length || routeIndex < routeSegments.length) {
    const baseSegment = baseSegments[baseIndex];
    const routeSegment = routeSegments[routeIndex];
    if (routeSegment) {
      if (routeSegment.type === SEGMENT_TYPE_WILDCARD) {
        const remainingBaseSegments = baseSegments.slice(baseIndex);
        let _splat;
        if (routeSegment.prefixSegment || routeSegment.suffixSegment) {
          if (!baseSegment) return false;
          const prefix2 = routeSegment.prefixSegment || "";
          const suffix = routeSegment.suffixSegment || "";
          const baseValue = baseSegment.value;
          if ("prefixSegment" in routeSegment) {
            if (!baseValue.startsWith(prefix2)) {
              return false;
            }
          }
          if ("suffixSegment" in routeSegment) {
            if (!baseSegments[baseSegments.length - 1]?.value.endsWith(suffix)) {
              return false;
            }
          }
          let rejoinedSplat = decodeURI(
            joinPaths(remainingBaseSegments.map((d2) => d2.value))
          );
          if (prefix2 && rejoinedSplat.startsWith(prefix2)) {
            rejoinedSplat = rejoinedSplat.slice(prefix2.length);
          }
          if (suffix && rejoinedSplat.endsWith(suffix)) {
            rejoinedSplat = rejoinedSplat.slice(
              0,
              rejoinedSplat.length - suffix.length
            );
          }
          _splat = rejoinedSplat;
        } else {
          _splat = decodeURI(
            joinPaths(remainingBaseSegments.map((d2) => d2.value))
          );
        }
        params["*"] = _splat;
        params["_splat"] = _splat;
        return true;
      }
      if (routeSegment.type === SEGMENT_TYPE_PATHNAME) {
        if (routeSegment.value === "/" && !baseSegment?.value) {
          routeIndex++;
          continue;
        }
        if (baseSegment) {
          if (caseSensitive) {
            if (routeSegment.value !== baseSegment.value) {
              return false;
            }
          } else if (routeSegment.value.toLowerCase() !== baseSegment.value.toLowerCase()) {
            return false;
          }
          baseIndex++;
          routeIndex++;
          continue;
        } else {
          return false;
        }
      }
      if (routeSegment.type === SEGMENT_TYPE_PARAM) {
        if (!baseSegment) {
          return false;
        }
        if (baseSegment.value === "/") {
          return false;
        }
        let _paramValue = "";
        let matched = false;
        if (routeSegment.prefixSegment || routeSegment.suffixSegment) {
          const prefix2 = routeSegment.prefixSegment || "";
          const suffix = routeSegment.suffixSegment || "";
          const baseValue = baseSegment.value;
          if (prefix2 && !baseValue.startsWith(prefix2)) {
            return false;
          }
          if (suffix && !baseValue.endsWith(suffix)) {
            return false;
          }
          let paramValue = baseValue;
          if (prefix2 && paramValue.startsWith(prefix2)) {
            paramValue = paramValue.slice(prefix2.length);
          }
          if (suffix && paramValue.endsWith(suffix)) {
            paramValue = paramValue.slice(0, paramValue.length - suffix.length);
          }
          _paramValue = decodeURIComponent(paramValue);
          matched = true;
        } else {
          _paramValue = decodeURIComponent(baseSegment.value);
          matched = true;
        }
        if (matched) {
          params[routeSegment.value.substring(1)] = _paramValue;
          baseIndex++;
        }
        routeIndex++;
        continue;
      }
      if (routeSegment.type === SEGMENT_TYPE_OPTIONAL_PARAM) {
        if (!baseSegment) {
          routeIndex++;
          continue;
        }
        if (baseSegment.value === "/") {
          routeIndex++;
          continue;
        }
        let _paramValue = "";
        let matched = false;
        if (routeSegment.prefixSegment || routeSegment.suffixSegment) {
          const prefix2 = routeSegment.prefixSegment || "";
          const suffix = routeSegment.suffixSegment || "";
          const baseValue = baseSegment.value;
          if ((!prefix2 || baseValue.startsWith(prefix2)) && (!suffix || baseValue.endsWith(suffix))) {
            let paramValue = baseValue;
            if (prefix2 && paramValue.startsWith(prefix2)) {
              paramValue = paramValue.slice(prefix2.length);
            }
            if (suffix && paramValue.endsWith(suffix)) {
              paramValue = paramValue.slice(
                0,
                paramValue.length - suffix.length
              );
            }
            _paramValue = decodeURIComponent(paramValue);
            matched = true;
          }
        } else {
          let shouldMatchOptional = true;
          for (let lookAhead = routeIndex + 1; lookAhead < routeSegments.length; lookAhead++) {
            const futureRouteSegment = routeSegments[lookAhead];
            if (futureRouteSegment?.type === SEGMENT_TYPE_PATHNAME && futureRouteSegment.value === baseSegment.value) {
              shouldMatchOptional = false;
              break;
            }
            if (futureRouteSegment?.type === SEGMENT_TYPE_PARAM || futureRouteSegment?.type === SEGMENT_TYPE_WILDCARD) {
              if (baseSegments.length < routeSegments.length) {
                shouldMatchOptional = false;
              }
              break;
            }
          }
          if (shouldMatchOptional) {
            _paramValue = decodeURIComponent(baseSegment.value);
            matched = true;
          }
        }
        if (matched) {
          params[routeSegment.value.substring(1)] = _paramValue;
          baseIndex++;
        }
        routeIndex++;
        continue;
      }
    }
    if (baseIndex < baseSegments.length && routeIndex >= routeSegments.length) {
      params["**"] = joinPaths(
        baseSegments.slice(baseIndex).map((d2) => d2.value)
      );
      return !!fuzzy && routeSegments[routeSegments.length - 1]?.value !== "/";
    }
    if (routeIndex < routeSegments.length && baseIndex >= baseSegments.length) {
      for (let i2 = routeIndex; i2 < routeSegments.length; i2++) {
        if (routeSegments[i2]?.type !== SEGMENT_TYPE_OPTIONAL_PARAM) {
          return false;
        }
      }
      break;
    }
    break;
  }
  return true;
}
const SLASH_SCORE = 0.75;
const STATIC_SEGMENT_SCORE = 1;
const REQUIRED_PARAM_BASE_SCORE = 0.5;
const OPTIONAL_PARAM_BASE_SCORE = 0.4;
const WILDCARD_PARAM_BASE_SCORE = 0.25;
const STATIC_AFTER_DYNAMIC_BONUS_SCORE = 0.2;
const BOTH_PRESENCE_BASE_SCORE = 0.05;
const PREFIX_PRESENCE_BASE_SCORE = 0.02;
const SUFFIX_PRESENCE_BASE_SCORE = 0.01;
const PREFIX_LENGTH_SCORE_MULTIPLIER = 2e-4;
const SUFFIX_LENGTH_SCORE_MULTIPLIER = 1e-4;
function handleParam(segment, baseScore) {
  if (segment.prefixSegment && segment.suffixSegment) {
    return baseScore + BOTH_PRESENCE_BASE_SCORE + PREFIX_LENGTH_SCORE_MULTIPLIER * segment.prefixSegment.length + SUFFIX_LENGTH_SCORE_MULTIPLIER * segment.suffixSegment.length;
  }
  if (segment.prefixSegment) {
    return baseScore + PREFIX_PRESENCE_BASE_SCORE + PREFIX_LENGTH_SCORE_MULTIPLIER * segment.prefixSegment.length;
  }
  if (segment.suffixSegment) {
    return baseScore + SUFFIX_PRESENCE_BASE_SCORE + SUFFIX_LENGTH_SCORE_MULTIPLIER * segment.suffixSegment.length;
  }
  return baseScore;
}
function sortRoutes(routes) {
  const scoredRoutes = [];
  routes.forEach((d2, i2) => {
    if (d2.isRoot || !d2.path) {
      return;
    }
    const trimmed = trimPathLeft(d2.fullPath);
    let parsed = parseRoutePathSegments(trimmed);
    let skip = 0;
    while (parsed.length > skip + 1 && parsed[skip]?.value === "/") {
      skip++;
    }
    if (skip > 0) parsed = parsed.slice(skip);
    let optionalParamCount = 0;
    let hasStaticAfter = false;
    const scores = parsed.map((segment, index) => {
      if (segment.value === "/") {
        return SLASH_SCORE;
      }
      if (segment.type === SEGMENT_TYPE_PATHNAME) {
        return STATIC_SEGMENT_SCORE;
      }
      let baseScore = void 0;
      if (segment.type === SEGMENT_TYPE_PARAM) {
        baseScore = REQUIRED_PARAM_BASE_SCORE;
      } else if (segment.type === SEGMENT_TYPE_OPTIONAL_PARAM) {
        baseScore = OPTIONAL_PARAM_BASE_SCORE;
        optionalParamCount++;
      } else {
        baseScore = WILDCARD_PARAM_BASE_SCORE;
      }
      for (let i22 = index + 1; i22 < parsed.length; i22++) {
        const nextSegment = parsed[i22];
        if (nextSegment.type === SEGMENT_TYPE_PATHNAME && nextSegment.value !== "/") {
          hasStaticAfter = true;
          return handleParam(
            segment,
            baseScore + STATIC_AFTER_DYNAMIC_BONUS_SCORE
          );
        }
      }
      return handleParam(segment, baseScore);
    });
    scoredRoutes.push({
      child: d2,
      trimmed,
      parsed,
      index: i2,
      scores,
      optionalParamCount,
      hasStaticAfter
    });
  });
  const flatRoutes = scoredRoutes.sort((a, b) => {
    const minLength = Math.min(a.scores.length, b.scores.length);
    for (let i2 = 0; i2 < minLength; i2++) {
      if (a.scores[i2] !== b.scores[i2]) {
        return b.scores[i2] - a.scores[i2];
      }
    }
    if (a.scores.length !== b.scores.length) {
      if (a.optionalParamCount !== b.optionalParamCount) {
        if (a.hasStaticAfter === b.hasStaticAfter) {
          return a.optionalParamCount - b.optionalParamCount;
        } else if (a.hasStaticAfter && !b.hasStaticAfter) {
          return -1;
        } else if (!a.hasStaticAfter && b.hasStaticAfter) {
          return 1;
        }
      }
      return b.scores.length - a.scores.length;
    }
    for (let i2 = 0; i2 < minLength; i2++) {
      if (a.parsed[i2].value !== b.parsed[i2].value) {
        return a.parsed[i2].value > b.parsed[i2].value ? 1 : -1;
      }
    }
    return a.index - b.index;
  }).map((d2, i2) => {
    d2.child.rank = i2;
    return d2.child;
  });
  return flatRoutes;
}
function processRouteTree({
  routeTree,
  initRoute
}) {
  const routesById = {};
  const routesByPath = {};
  const recurseRoutes = (childRoutes) => {
    childRoutes.forEach((childRoute, i2) => {
      initRoute?.(childRoute, i2);
      const existingRoute = routesById[childRoute.id];
      invariant(
        !existingRoute,
        `Duplicate routes found with id: ${String(childRoute.id)}`
      );
      routesById[childRoute.id] = childRoute;
      if (!childRoute.isRoot && childRoute.path) {
        const trimmedFullPath = trimPathRight(childRoute.fullPath);
        if (!routesByPath[trimmedFullPath] || childRoute.fullPath.endsWith("/")) {
          routesByPath[trimmedFullPath] = childRoute;
        }
      }
      const children2 = childRoute.children;
      if (children2?.length) {
        recurseRoutes(children2);
      }
    });
  };
  recurseRoutes([routeTree]);
  const flatRoutes = sortRoutes(Object.values(routesById));
  return { routesById, routesByPath, flatRoutes };
}
function isNotFound(obj) {
  return !!obj?.isNotFound;
}
function getSafeSessionStorage() {
  try {
    if (false) ;
  } catch {
  }
  return void 0;
}
const storageKey = "tsr-scroll-restoration-v1_3";
const throttle = (fn, wait) => {
  let timeout;
  return (...args) => {
    if (!timeout) {
      timeout = setTimeout(() => {
        fn(...args);
        timeout = null;
      }, wait);
    }
  };
};
function createScrollRestorationCache() {
  const safeSessionStorage = getSafeSessionStorage();
  if (!safeSessionStorage) {
    return null;
  }
  const persistedState = safeSessionStorage.getItem(storageKey);
  let state = persistedState ? JSON.parse(persistedState) : {};
  return {
    state,
    // This setter is simply to make sure that we set the sessionStorage right
    // after the state is updated. It doesn't necessarily need to be a functional
    // update.
    set: (updater) => (state = functionalUpdate(updater, state) || state, safeSessionStorage.setItem(storageKey, JSON.stringify(state)))
  };
}
const scrollRestorationCache = createScrollRestorationCache();
const defaultGetScrollRestorationKey = (location) => {
  return location.state.__TSR_key || location.href;
};
function getCssSelector(el) {
  const path = [];
  let parent;
  while (parent = el.parentNode) {
    path.push(
      `${el.tagName}:nth-child(${Array.prototype.indexOf.call(parent.children, el) + 1})`
    );
    el = parent;
  }
  return `${path.reverse().join(" > ")}`.toLowerCase();
}
let ignoreScroll = false;
function restoreScroll({
  storageKey: storageKey2,
  key,
  behavior,
  shouldScrollRestoration,
  scrollToTopSelectors,
  location
}) {
  let byKey;
  try {
    byKey = JSON.parse(sessionStorage.getItem(storageKey2) || "{}");
  } catch (error) {
    console.error(error);
    return;
  }
  const resolvedKey = key || window.history.state?.__TSR_key;
  const elementEntries = byKey[resolvedKey];
  ignoreScroll = true;
  scroll: {
    if (shouldScrollRestoration && elementEntries && Object.keys(elementEntries).length > 0) {
      for (const elementSelector in elementEntries) {
        const entry = elementEntries[elementSelector];
        if (elementSelector === "window") {
          window.scrollTo({
            top: entry.scrollY,
            left: entry.scrollX,
            behavior
          });
        } else if (elementSelector) {
          const element = document.querySelector(elementSelector);
          if (element) {
            element.scrollLeft = entry.scrollX;
            element.scrollTop = entry.scrollY;
          }
        }
      }
      break scroll;
    }
    const hash = (location ?? window.location).hash.split("#", 2)[1];
    if (hash) {
      const hashScrollIntoViewOptions = window.history.state?.__hashScrollIntoViewOptions ?? true;
      if (hashScrollIntoViewOptions) {
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView(hashScrollIntoViewOptions);
        }
      }
      break scroll;
    }
    const scrollOptions = { top: 0, left: 0, behavior };
    window.scrollTo(scrollOptions);
    if (scrollToTopSelectors) {
      for (const selector of scrollToTopSelectors) {
        if (selector === "window") continue;
        const element = typeof selector === "function" ? selector() : document.querySelector(selector);
        if (element) element.scrollTo(scrollOptions);
      }
    }
  }
  ignoreScroll = false;
}
function setupScrollRestoration(router, force) {
  if (!scrollRestorationCache && !router.isServer) {
    return;
  }
  const shouldScrollRestoration = router.options.scrollRestoration ?? false;
  if (shouldScrollRestoration) {
    router.isScrollRestoring = true;
  }
  if (router.isServer || router.isScrollRestorationSetup || !scrollRestorationCache) {
    return;
  }
  router.isScrollRestorationSetup = true;
  ignoreScroll = false;
  const getKey = router.options.getScrollRestorationKey || defaultGetScrollRestorationKey;
  window.history.scrollRestoration = "manual";
  const onScroll = (event) => {
    if (ignoreScroll || !router.isScrollRestoring) {
      return;
    }
    let elementSelector = "";
    if (event.target === document || event.target === window) {
      elementSelector = "window";
    } else {
      const attrId = event.target.getAttribute(
        "data-scroll-restoration-id"
      );
      if (attrId) {
        elementSelector = `[data-scroll-restoration-id="${attrId}"]`;
      } else {
        elementSelector = getCssSelector(event.target);
      }
    }
    const restoreKey = getKey(router.state.location);
    scrollRestorationCache.set((state) => {
      const keyEntry = state[restoreKey] ||= {};
      const elementEntry = keyEntry[elementSelector] ||= {};
      if (elementSelector === "window") {
        elementEntry.scrollX = window.scrollX || 0;
        elementEntry.scrollY = window.scrollY || 0;
      } else if (elementSelector) {
        const element = document.querySelector(elementSelector);
        if (element) {
          elementEntry.scrollX = element.scrollLeft || 0;
          elementEntry.scrollY = element.scrollTop || 0;
        }
      }
      return state;
    });
  };
  if (typeof document !== "undefined") {
    document.addEventListener("scroll", throttle(onScroll, 100), true);
  }
  router.subscribe("onRendered", (event) => {
    const cacheKey = getKey(event.toLocation);
    if (!router.resetNextScroll) {
      router.resetNextScroll = true;
      return;
    }
    if (typeof router.options.scrollRestoration === "function") {
      const shouldRestore = router.options.scrollRestoration({
        location: router.latestLocation
      });
      if (!shouldRestore) {
        return;
      }
    }
    restoreScroll({
      storageKey,
      key: cacheKey,
      behavior: router.options.scrollRestorationBehavior,
      shouldScrollRestoration: router.isScrollRestoring,
      scrollToTopSelectors: router.options.scrollToTopSelectors,
      location: router.history.location
    });
    if (router.isScrollRestoring) {
      scrollRestorationCache.set((state) => {
        state[cacheKey] ||= {};
        return state;
      });
    }
  });
}
function handleHashScroll(router) {
  if (typeof document !== "undefined" && document.querySelector) {
    const hashScrollIntoViewOptions = router.state.location.state.__hashScrollIntoViewOptions ?? true;
    if (hashScrollIntoViewOptions && router.state.location.hash !== "") {
      const el = document.getElementById(router.state.location.hash);
      if (el) {
        el.scrollIntoView(hashScrollIntoViewOptions);
      }
    }
  }
}
function encode(obj, stringify = String) {
  const result = new URLSearchParams();
  for (const key in obj) {
    const val = obj[key];
    if (val !== void 0) {
      result.set(key, stringify(val));
    }
  }
  return result.toString();
}
function toValue(str) {
  if (!str) return "";
  if (str === "false") return false;
  if (str === "true") return true;
  return +str * 0 === 0 && +str + "" === str ? +str : str;
}
function decode(str) {
  const searchParams = new URLSearchParams(str);
  const result = {};
  for (const [key, value] of searchParams.entries()) {
    const previousValue = result[key];
    if (previousValue == null) {
      result[key] = toValue(value);
    } else if (Array.isArray(previousValue)) {
      previousValue.push(toValue(value));
    } else {
      result[key] = [previousValue, toValue(value)];
    }
  }
  return result;
}
const defaultParseSearch = parseSearchWith(JSON.parse);
const defaultStringifySearch = stringifySearchWith(
  JSON.stringify,
  JSON.parse
);
function parseSearchWith(parser) {
  return (searchStr) => {
    if (searchStr[0] === "?") {
      searchStr = searchStr.substring(1);
    }
    const query = decode(searchStr);
    for (const key in query) {
      const value = query[key];
      if (typeof value === "string") {
        try {
          query[key] = parser(value);
        } catch (_err) {
        }
      }
    }
    return query;
  };
}
function stringifySearchWith(stringify, parser) {
  const hasParser = typeof parser === "function";
  function stringifyValue(val) {
    if (typeof val === "object" && val !== null) {
      try {
        return stringify(val);
      } catch (_err) {
      }
    } else if (hasParser && typeof val === "string") {
      try {
        parser(val);
        return stringify(val);
      } catch (_err) {
      }
    }
    return val;
  }
  return (search) => {
    const searchStr = encode(search, stringifyValue);
    return searchStr ? `?${searchStr}` : "";
  };
}
function redirect(opts) {
  opts.statusCode = opts.statusCode || opts.code || 307;
  if (!opts.reloadDocument && typeof opts.href === "string") {
    try {
      new URL(opts.href);
      opts.reloadDocument = true;
    } catch {
    }
  }
  const headers = new Headers(opts.headers);
  if (opts.href && headers.get("Location") === null) {
    headers.set("Location", opts.href);
  }
  const response = new Response(null, {
    status: opts.statusCode,
    headers
  });
  response.options = opts;
  if (opts.throw) {
    throw response;
  }
  return response;
}
function isRedirect(obj) {
  return obj instanceof Response && !!obj.options;
}
function isResolvedRedirect(obj) {
  return isRedirect(obj) && !!obj.options.href;
}
function createLRUCache(max) {
  const cache = /* @__PURE__ */ new Map();
  let oldest;
  let newest;
  const touch = (entry) => {
    if (!entry.next) return;
    if (!entry.prev) {
      entry.next.prev = void 0;
      oldest = entry.next;
      entry.next = void 0;
      if (newest) {
        entry.prev = newest;
        newest.next = entry;
      }
    } else {
      entry.prev.next = entry.next;
      entry.next.prev = entry.prev;
      entry.next = void 0;
      if (newest) {
        newest.next = entry;
        entry.prev = newest;
      }
    }
    newest = entry;
  };
  return {
    get(key) {
      const entry = cache.get(key);
      if (!entry) return void 0;
      touch(entry);
      return entry.value;
    },
    set(key, value) {
      if (cache.size >= max && oldest) {
        const toDelete = oldest;
        cache.delete(toDelete.key);
        if (toDelete.next) {
          oldest = toDelete.next;
          toDelete.next.prev = void 0;
        }
        if (toDelete === newest) {
          newest = void 0;
        }
      }
      const existing = cache.get(key);
      if (existing) {
        existing.value = value;
        touch(existing);
      } else {
        const entry = { key, value, prev: newest };
        if (newest) newest.next = entry;
        newest = entry;
        if (!oldest) oldest = entry;
        cache.set(key, entry);
      }
    }
  };
}
const triggerOnReady = (inner) => {
  if (!inner.rendered) {
    inner.rendered = true;
    return inner.onReady?.();
  }
};
const resolvePreload = (inner, matchId) => {
  return !!(inner.preload && !inner.router.state.matches.some((d2) => d2.id === matchId));
};
const _handleNotFound = (inner, err) => {
  const routeCursor = inner.router.routesById[err.routeId ?? ""] ?? inner.router.routeTree;
  if (!routeCursor.options.notFoundComponent && inner.router.options?.defaultNotFoundComponent) {
    routeCursor.options.notFoundComponent = inner.router.options.defaultNotFoundComponent;
  }
  invariant(
    routeCursor.options.notFoundComponent
  );
  const matchForRoute = inner.matches.find((m2) => m2.routeId === routeCursor.id);
  invariant(matchForRoute, "Could not find match for route: " + routeCursor.id);
  inner.updateMatch(matchForRoute.id, (prev) => ({
    ...prev,
    status: "notFound",
    error: err,
    isFetching: false
  }));
  if (err.routerCode === "BEFORE_LOAD" && routeCursor.parentRoute) {
    err.routeId = routeCursor.parentRoute.id;
    _handleNotFound(inner, err);
  }
};
const handleRedirectAndNotFound = (inner, match, err) => {
  if (!isRedirect(err) && !isNotFound(err)) return;
  if (isRedirect(err) && err.redirectHandled && !err.options.reloadDocument) {
    throw err;
  }
  if (match) {
    match._nonReactive.beforeLoadPromise?.resolve();
    match._nonReactive.loaderPromise?.resolve();
    match._nonReactive.beforeLoadPromise = void 0;
    match._nonReactive.loaderPromise = void 0;
    const status = isRedirect(err) ? "redirected" : "notFound";
    inner.updateMatch(match.id, (prev) => ({
      ...prev,
      status,
      isFetching: false,
      error: err
    }));
    if (isNotFound(err) && !err.routeId) {
      err.routeId = match.routeId;
    }
    match._nonReactive.loadPromise?.resolve();
  }
  if (isRedirect(err)) {
    inner.rendered = true;
    err.options._fromLocation = inner.location;
    err.redirectHandled = true;
    err = inner.router.resolveRedirect(err);
    throw err;
  } else {
    _handleNotFound(inner, err);
    throw err;
  }
};
const shouldSkipLoader = (inner, matchId) => {
  const match = inner.router.getMatch(matchId);
  if (!inner.router.isServer && match._nonReactive.dehydrated) {
    return true;
  }
  if (inner.router.isServer && match.ssr === false) {
    return true;
  }
  return false;
};
const handleSerialError = (inner, index, err, routerCode) => {
  const { id: matchId, routeId } = inner.matches[index];
  const route = inner.router.looseRoutesById[routeId];
  if (err instanceof Promise) {
    throw err;
  }
  err.routerCode = routerCode;
  inner.firstBadMatchIndex ??= index;
  handleRedirectAndNotFound(inner, inner.router.getMatch(matchId), err);
  try {
    route.options.onError?.(err);
  } catch (errorHandlerErr) {
    err = errorHandlerErr;
    handleRedirectAndNotFound(inner, inner.router.getMatch(matchId), err);
  }
  inner.updateMatch(matchId, (prev) => {
    prev._nonReactive.beforeLoadPromise?.resolve();
    prev._nonReactive.beforeLoadPromise = void 0;
    prev._nonReactive.loadPromise?.resolve();
    return {
      ...prev,
      error: err,
      status: "error",
      isFetching: false,
      updatedAt: Date.now(),
      abortController: new AbortController()
    };
  });
};
const isBeforeLoadSsr = (inner, matchId, index, route) => {
  const existingMatch = inner.router.getMatch(matchId);
  const parentMatchId = inner.matches[index - 1]?.id;
  const parentMatch = parentMatchId ? inner.router.getMatch(parentMatchId) : void 0;
  if (inner.router.isShell()) {
    existingMatch.ssr = matchId === rootRouteId;
    return;
  }
  if (parentMatch?.ssr === false) {
    existingMatch.ssr = false;
    return;
  }
  const parentOverride = (tempSsr2) => {
    if (tempSsr2 === true && parentMatch?.ssr === "data-only") {
      return "data-only";
    }
    return tempSsr2;
  };
  const defaultSsr = inner.router.options.defaultSsr ?? true;
  if (route.options.ssr === void 0) {
    existingMatch.ssr = parentOverride(defaultSsr);
    return;
  }
  if (typeof route.options.ssr !== "function") {
    existingMatch.ssr = parentOverride(route.options.ssr);
    return;
  }
  const { search, params } = existingMatch;
  const ssrFnContext = {
    search: makeMaybe(search, existingMatch.searchError),
    params: makeMaybe(params, existingMatch.paramsError),
    location: inner.location,
    matches: inner.matches.map((match) => ({
      index: match.index,
      pathname: match.pathname,
      fullPath: match.fullPath,
      staticData: match.staticData,
      id: match.id,
      routeId: match.routeId,
      search: makeMaybe(match.search, match.searchError),
      params: makeMaybe(match.params, match.paramsError),
      ssr: match.ssr
    }))
  };
  const tempSsr = route.options.ssr(ssrFnContext);
  if (isPromise(tempSsr)) {
    return tempSsr.then((ssr2) => {
      existingMatch.ssr = parentOverride(ssr2 ?? defaultSsr);
    });
  }
  existingMatch.ssr = parentOverride(tempSsr ?? defaultSsr);
  return;
};
const setupPendingTimeout = (inner, matchId, route, match) => {
  if (match._nonReactive.pendingTimeout !== void 0) return;
  const pendingMs = route.options.pendingMs ?? inner.router.options.defaultPendingMs;
  const shouldPending = !!(inner.onReady && !inner.router.isServer && !resolvePreload(inner, matchId) && (route.options.loader || route.options.beforeLoad || routeNeedsPreload(route)) && typeof pendingMs === "number" && pendingMs !== Infinity && (route.options.pendingComponent ?? inner.router.options?.defaultPendingComponent));
  if (shouldPending) {
    const pendingTimeout = setTimeout(() => {
      triggerOnReady(inner);
    }, pendingMs);
    match._nonReactive.pendingTimeout = pendingTimeout;
  }
};
const preBeforeLoadSetup = (inner, matchId, route) => {
  const existingMatch = inner.router.getMatch(matchId);
  if (!existingMatch._nonReactive.beforeLoadPromise && !existingMatch._nonReactive.loaderPromise)
    return;
  setupPendingTimeout(inner, matchId, route, existingMatch);
  const then = () => {
    const match = inner.router.getMatch(matchId);
    if (match.preload && (match.status === "redirected" || match.status === "notFound")) {
      handleRedirectAndNotFound(inner, match, match.error);
    }
  };
  return existingMatch._nonReactive.beforeLoadPromise ? existingMatch._nonReactive.beforeLoadPromise.then(then) : then();
};
const executeBeforeLoad = (inner, matchId, index, route) => {
  const match = inner.router.getMatch(matchId);
  const prevLoadPromise = match._nonReactive.loadPromise;
  match._nonReactive.loadPromise = createControlledPromise(() => {
    prevLoadPromise?.resolve();
  });
  const { paramsError, searchError } = match;
  if (paramsError) {
    handleSerialError(inner, index, paramsError, "PARSE_PARAMS");
  }
  if (searchError) {
    handleSerialError(inner, index, searchError, "VALIDATE_SEARCH");
  }
  setupPendingTimeout(inner, matchId, route, match);
  const abortController = new AbortController();
  const parentMatchId = inner.matches[index - 1]?.id;
  const parentMatch = parentMatchId ? inner.router.getMatch(parentMatchId) : void 0;
  const parentMatchContext = parentMatch?.context ?? inner.router.options.context ?? void 0;
  const context = { ...parentMatchContext, ...match.__routeContext };
  let isPending = false;
  const pending = () => {
    if (isPending) return;
    isPending = true;
    inner.updateMatch(matchId, (prev) => ({
      ...prev,
      isFetching: "beforeLoad",
      fetchCount: prev.fetchCount + 1,
      abortController,
      context
    }));
  };
  const resolve = () => {
    match._nonReactive.beforeLoadPromise?.resolve();
    match._nonReactive.beforeLoadPromise = void 0;
    inner.updateMatch(matchId, (prev) => ({
      ...prev,
      isFetching: false
    }));
  };
  if (!route.options.beforeLoad) {
    batch(() => {
      pending();
      resolve();
    });
    return;
  }
  match._nonReactive.beforeLoadPromise = createControlledPromise();
  const { search, params, cause } = match;
  const preload = resolvePreload(inner, matchId);
  const beforeLoadFnContext = {
    search,
    abortController,
    params,
    preload,
    context,
    location: inner.location,
    navigate: (opts) => inner.router.navigate({
      ...opts,
      _fromLocation: inner.location
    }),
    buildLocation: inner.router.buildLocation,
    cause: preload ? "preload" : cause,
    matches: inner.matches,
    ...inner.router.options.additionalContext
  };
  const updateContext = (beforeLoadContext2) => {
    if (beforeLoadContext2 === void 0) {
      batch(() => {
        pending();
        resolve();
      });
      return;
    }
    if (isRedirect(beforeLoadContext2) || isNotFound(beforeLoadContext2)) {
      pending();
      handleSerialError(inner, index, beforeLoadContext2, "BEFORE_LOAD");
    }
    batch(() => {
      pending();
      inner.updateMatch(matchId, (prev) => ({
        ...prev,
        __beforeLoadContext: beforeLoadContext2,
        context: {
          ...prev.context,
          ...beforeLoadContext2
        }
      }));
      resolve();
    });
  };
  let beforeLoadContext;
  try {
    beforeLoadContext = route.options.beforeLoad(beforeLoadFnContext);
    if (isPromise(beforeLoadContext)) {
      pending();
      return beforeLoadContext.catch((err) => {
        handleSerialError(inner, index, err, "BEFORE_LOAD");
      }).then(updateContext);
    }
  } catch (err) {
    pending();
    handleSerialError(inner, index, err, "BEFORE_LOAD");
  }
  updateContext(beforeLoadContext);
  return;
};
const handleBeforeLoad = (inner, index) => {
  const { id: matchId, routeId } = inner.matches[index];
  const route = inner.router.looseRoutesById[routeId];
  const serverSsr = () => {
    if (inner.router.isServer) {
      const maybePromise = isBeforeLoadSsr(inner, matchId, index, route);
      if (isPromise(maybePromise)) return maybePromise.then(queueExecution);
    }
    return queueExecution();
  };
  const execute = () => executeBeforeLoad(inner, matchId, index, route);
  const queueExecution = () => {
    if (shouldSkipLoader(inner, matchId)) return;
    const result = preBeforeLoadSetup(inner, matchId, route);
    return isPromise(result) ? result.then(execute) : execute();
  };
  return serverSsr();
};
const executeHead = (inner, matchId, route) => {
  const match = inner.router.getMatch(matchId);
  if (!match) {
    return;
  }
  if (!route.options.head && !route.options.scripts && !route.options.headers) {
    return;
  }
  const assetContext = {
    matches: inner.matches,
    match,
    params: match.params,
    loaderData: match.loaderData
  };
  return Promise.all([
    route.options.head?.(assetContext),
    route.options.scripts?.(assetContext),
    route.options.headers?.(assetContext)
  ]).then(([headFnContent, scripts, headers]) => {
    const meta = headFnContent?.meta;
    const links = headFnContent?.links;
    const headScripts = headFnContent?.scripts;
    const styles = headFnContent?.styles;
    return {
      meta,
      links,
      headScripts,
      headers,
      scripts,
      styles
    };
  });
};
const getLoaderContext = (inner, matchId, index, route) => {
  const parentMatchPromise = inner.matchPromises[index - 1];
  const { params, loaderDeps, abortController, context, cause } = inner.router.getMatch(matchId);
  const preload = resolvePreload(inner, matchId);
  return {
    params,
    deps: loaderDeps,
    preload: !!preload,
    parentMatchPromise,
    abortController,
    context,
    location: inner.location,
    navigate: (opts) => inner.router.navigate({
      ...opts,
      _fromLocation: inner.location
    }),
    cause: preload ? "preload" : cause,
    route,
    ...inner.router.options.additionalContext
  };
};
const runLoader = async (inner, matchId, index, route) => {
  try {
    const match = inner.router.getMatch(matchId);
    try {
      if (!inner.router.isServer || match.ssr === true) {
        loadRouteChunk(route);
      }
      const loaderResult = route.options.loader?.(
        getLoaderContext(inner, matchId, index, route)
      );
      const loaderResultIsPromise = route.options.loader && isPromise(loaderResult);
      const willLoadSomething = !!(loaderResultIsPromise || route._lazyPromise || route._componentsPromise || route.options.head || route.options.scripts || route.options.headers || match._nonReactive.minPendingPromise);
      if (willLoadSomething) {
        inner.updateMatch(matchId, (prev) => ({
          ...prev,
          isFetching: "loader"
        }));
      }
      if (route.options.loader) {
        const loaderData = loaderResultIsPromise ? await loaderResult : loaderResult;
        handleRedirectAndNotFound(
          inner,
          inner.router.getMatch(matchId),
          loaderData
        );
        if (loaderData !== void 0) {
          inner.updateMatch(matchId, (prev) => ({
            ...prev,
            loaderData
          }));
        }
      }
      if (route._lazyPromise) await route._lazyPromise;
      const headResult = executeHead(inner, matchId, route);
      const head = headResult ? await headResult : void 0;
      const pendingPromise = match._nonReactive.minPendingPromise;
      if (pendingPromise) await pendingPromise;
      if (route._componentsPromise) await route._componentsPromise;
      inner.updateMatch(matchId, (prev) => ({
        ...prev,
        error: void 0,
        status: "success",
        isFetching: false,
        updatedAt: Date.now(),
        ...head
      }));
    } catch (e) {
      let error = e;
      const pendingPromise = match._nonReactive.minPendingPromise;
      if (pendingPromise) await pendingPromise;
      handleRedirectAndNotFound(inner, inner.router.getMatch(matchId), e);
      try {
        route.options.onError?.(e);
      } catch (onErrorError) {
        error = onErrorError;
        handleRedirectAndNotFound(
          inner,
          inner.router.getMatch(matchId),
          onErrorError
        );
      }
      const headResult = executeHead(inner, matchId, route);
      const head = headResult ? await headResult : void 0;
      inner.updateMatch(matchId, (prev) => ({
        ...prev,
        error,
        status: "error",
        isFetching: false,
        ...head
      }));
    }
  } catch (err) {
    const match = inner.router.getMatch(matchId);
    if (match) {
      const headResult = executeHead(inner, matchId, route);
      if (headResult) {
        const head = await headResult;
        inner.updateMatch(matchId, (prev) => ({
          ...prev,
          ...head
        }));
      }
      match._nonReactive.loaderPromise = void 0;
    }
    handleRedirectAndNotFound(inner, match, err);
  }
};
const loadRouteMatch = async (inner, index) => {
  const { id: matchId, routeId } = inner.matches[index];
  let loaderShouldRunAsync = false;
  let loaderIsRunningAsync = false;
  const route = inner.router.looseRoutesById[routeId];
  if (shouldSkipLoader(inner, matchId)) {
    if (inner.router.isServer) {
      const headResult = executeHead(inner, matchId, route);
      if (headResult) {
        const head = await headResult;
        inner.updateMatch(matchId, (prev) => ({
          ...prev,
          ...head
        }));
      }
      return inner.router.getMatch(matchId);
    }
  } else {
    const prevMatch = inner.router.getMatch(matchId);
    if (prevMatch._nonReactive.loaderPromise) {
      if (prevMatch.status === "success" && !inner.sync && !prevMatch.preload) {
        return prevMatch;
      }
      await prevMatch._nonReactive.loaderPromise;
      const match2 = inner.router.getMatch(matchId);
      if (match2.error) {
        handleRedirectAndNotFound(inner, match2, match2.error);
      }
    } else {
      const age = Date.now() - prevMatch.updatedAt;
      const preload = resolvePreload(inner, matchId);
      const staleAge = preload ? route.options.preloadStaleTime ?? inner.router.options.defaultPreloadStaleTime ?? 3e4 : route.options.staleTime ?? inner.router.options.defaultStaleTime ?? 0;
      const shouldReloadOption = route.options.shouldReload;
      const shouldReload = typeof shouldReloadOption === "function" ? shouldReloadOption(getLoaderContext(inner, matchId, index, route)) : shouldReloadOption;
      const nextPreload = !!preload && !inner.router.state.matches.some((d2) => d2.id === matchId);
      const match2 = inner.router.getMatch(matchId);
      match2._nonReactive.loaderPromise = createControlledPromise();
      if (nextPreload !== match2.preload) {
        inner.updateMatch(matchId, (prev) => ({
          ...prev,
          preload: nextPreload
        }));
      }
      const { status, invalid } = match2;
      loaderShouldRunAsync = status === "success" && (invalid || (shouldReload ?? age > staleAge));
      if (preload && route.options.preload === false) ;
      else if (loaderShouldRunAsync && !inner.sync) {
        loaderIsRunningAsync = true;
        (async () => {
          try {
            await runLoader(inner, matchId, index, route);
            const match3 = inner.router.getMatch(matchId);
            match3._nonReactive.loaderPromise?.resolve();
            match3._nonReactive.loadPromise?.resolve();
            match3._nonReactive.loaderPromise = void 0;
          } catch (err) {
            if (isRedirect(err)) {
              await inner.router.navigate(err.options);
            }
          }
        })();
      } else if (status !== "success" || loaderShouldRunAsync && inner.sync) {
        await runLoader(inner, matchId, index, route);
      } else {
        const headResult = executeHead(inner, matchId, route);
        if (headResult) {
          const head = await headResult;
          inner.updateMatch(matchId, (prev) => ({
            ...prev,
            ...head
          }));
        }
      }
    }
  }
  const match = inner.router.getMatch(matchId);
  if (!loaderIsRunningAsync) {
    match._nonReactive.loaderPromise?.resolve();
    match._nonReactive.loadPromise?.resolve();
  }
  clearTimeout(match._nonReactive.pendingTimeout);
  match._nonReactive.pendingTimeout = void 0;
  if (!loaderIsRunningAsync) match._nonReactive.loaderPromise = void 0;
  match._nonReactive.dehydrated = void 0;
  const nextIsFetching = loaderIsRunningAsync ? match.isFetching : false;
  if (nextIsFetching !== match.isFetching || match.invalid !== false) {
    inner.updateMatch(matchId, (prev) => ({
      ...prev,
      isFetching: nextIsFetching,
      invalid: false
    }));
    return inner.router.getMatch(matchId);
  } else {
    return match;
  }
};
async function loadMatches(arg) {
  const inner = Object.assign(arg, {
    matchPromises: []
  });
  if (!inner.router.isServer && inner.router.state.matches.some((d2) => d2._forcePending)) {
    triggerOnReady(inner);
  }
  try {
    for (let i2 = 0; i2 < inner.matches.length; i2++) {
      const beforeLoad = handleBeforeLoad(inner, i2);
      if (isPromise(beforeLoad)) await beforeLoad;
    }
    const max = inner.firstBadMatchIndex ?? inner.matches.length;
    for (let i2 = 0; i2 < max; i2++) {
      inner.matchPromises.push(loadRouteMatch(inner, i2));
    }
    await Promise.all(inner.matchPromises);
    const readyPromise = triggerOnReady(inner);
    if (isPromise(readyPromise)) await readyPromise;
  } catch (err) {
    if (isNotFound(err) && !inner.preload) {
      const readyPromise = triggerOnReady(inner);
      if (isPromise(readyPromise)) await readyPromise;
      throw err;
    }
    if (isRedirect(err)) {
      throw err;
    }
  }
  return inner.matches;
}
async function loadRouteChunk(route) {
  if (!route._lazyLoaded && route._lazyPromise === void 0) {
    if (route.lazyFn) {
      route._lazyPromise = route.lazyFn().then((lazyRoute) => {
        const { id: _id, ...options } = lazyRoute.options;
        Object.assign(route.options, options);
        route._lazyLoaded = true;
        route._lazyPromise = void 0;
      });
    } else {
      route._lazyLoaded = true;
    }
  }
  if (!route._componentsLoaded && route._componentsPromise === void 0) {
    const loadComponents = () => {
      const preloads = [];
      for (const type of componentTypes) {
        const preload = route.options[type]?.preload;
        if (preload) preloads.push(preload());
      }
      if (preloads.length)
        return Promise.all(preloads).then(() => {
          route._componentsLoaded = true;
          route._componentsPromise = void 0;
        });
      route._componentsLoaded = true;
      route._componentsPromise = void 0;
      return;
    };
    route._componentsPromise = route._lazyPromise ? route._lazyPromise.then(loadComponents) : loadComponents();
  }
  return route._componentsPromise;
}
function makeMaybe(value, error) {
  if (error) {
    return { status: "error", error };
  }
  return { status: "success", value };
}
function routeNeedsPreload(route) {
  for (const componentType of componentTypes) {
    if (route.options[componentType]?.preload) {
      return true;
    }
  }
  return false;
}
const componentTypes = [
  "component",
  "errorComponent",
  "pendingComponent",
  "notFoundComponent"
];
function composeRewrites(rewrites) {
  return {
    input: ({ url }) => {
      for (const rewrite of rewrites) {
        url = executeRewriteInput(rewrite, url);
      }
      return url;
    },
    output: ({ url }) => {
      for (let i2 = rewrites.length - 1; i2 >= 0; i2--) {
        url = executeRewriteOutput(rewrites[i2], url);
      }
      return url;
    }
  };
}
function rewriteBasepath(opts) {
  const trimmedBasepath = trimPath(opts.basepath);
  const normalizedBasepath = `/${trimmedBasepath}`;
  const normalizedBasepathWithSlash = `${normalizedBasepath}/`;
  const checkBasepath = opts.caseSensitive ? normalizedBasepath : normalizedBasepath.toLowerCase();
  const checkBasepathWithSlash = opts.caseSensitive ? normalizedBasepathWithSlash : normalizedBasepathWithSlash.toLowerCase();
  return {
    input: ({ url }) => {
      const pathname = opts.caseSensitive ? url.pathname : url.pathname.toLowerCase();
      if (pathname === checkBasepath) {
        url.pathname = "/";
      } else if (pathname.startsWith(checkBasepathWithSlash)) {
        url.pathname = url.pathname.slice(normalizedBasepath.length);
      }
      return url;
    },
    output: ({ url }) => {
      url.pathname = joinPaths(["/", trimmedBasepath, url.pathname]);
      return url;
    }
  };
}
function executeRewriteInput(rewrite, url) {
  const res = rewrite?.input?.({ url });
  if (res) {
    if (typeof res === "string") {
      return new URL(res);
    } else if (res instanceof URL) {
      return res;
    }
  }
  return url;
}
function executeRewriteOutput(rewrite, url) {
  const res = rewrite?.output?.({ url });
  if (res) {
    if (typeof res === "string") {
      return new URL(res);
    } else if (res instanceof URL) {
      return res;
    }
  }
  return url;
}
function getLocationChangeInfo(routerState) {
  const fromLocation = routerState.resolvedLocation;
  const toLocation = routerState.location;
  const pathChanged = fromLocation?.pathname !== toLocation.pathname;
  const hrefChanged = fromLocation?.href !== toLocation.href;
  const hashChanged = fromLocation?.hash !== toLocation.hash;
  return { fromLocation, toLocation, pathChanged, hrefChanged, hashChanged };
}
class RouterCore {
  /**
   * @deprecated Use the `createRouter` function instead
   */
  constructor(options) {
    this.tempLocationKey = `${Math.round(
      Math.random() * 1e7
    )}`;
    this.resetNextScroll = true;
    this.shouldViewTransition = void 0;
    this.isViewTransitionTypesSupported = void 0;
    this.subscribers = /* @__PURE__ */ new Set();
    this.isScrollRestoring = false;
    this.isScrollRestorationSetup = false;
    this.startTransition = (fn) => fn();
    this.update = (newOptions) => {
      if (newOptions.notFoundRoute) {
        console.warn(
          "The notFoundRoute API is deprecated and will be removed in the next major version. See https://tanstack.com/router/v1/docs/framework/react/guide/not-found-errors#migrating-from-notfoundroute for more info."
        );
      }
      const prevOptions = this.options;
      const prevBasepath = this.basepath ?? prevOptions?.basepath ?? "/";
      const basepathWasUnset = this.basepath === void 0;
      const prevRewriteOption = prevOptions?.rewrite;
      this.options = {
        ...prevOptions,
        ...newOptions
      };
      this.isServer = this.options.isServer ?? typeof document === "undefined";
      this.pathParamsDecodeCharMap = this.options.pathParamsAllowedCharacters ? new Map(
        this.options.pathParamsAllowedCharacters.map((char) => [
          encodeURIComponent(char),
          char
        ])
      ) : void 0;
      if (!this.history || this.options.history && this.options.history !== this.history) {
        if (!this.options.history) {
          if (!this.isServer) {
            this.history = createBrowserHistory();
          }
        } else {
          this.history = this.options.history;
        }
      }
      this.origin = this.options.origin;
      if (!this.origin) {
        if (!this.isServer) {
          this.origin = window.origin;
        } else {
          this.origin = "http://localhost";
        }
      }
      if (this.history) {
        this.updateLatestLocation();
      }
      if (this.options.routeTree !== this.routeTree) {
        this.routeTree = this.options.routeTree;
        this.buildRouteTree();
      }
      if (!this.__store && this.latestLocation) {
        this.__store = new Store(getInitialRouterState(this.latestLocation), {
          onUpdate: () => {
            this.__store.state = {
              ...this.state,
              cachedMatches: this.state.cachedMatches.filter(
                (d2) => !["redirected"].includes(d2.status)
              )
            };
          }
        });
        setupScrollRestoration(this);
      }
      let needsLocationUpdate = false;
      const nextBasepath = this.options.basepath ?? "/";
      const nextRewriteOption = this.options.rewrite;
      const basepathChanged = basepathWasUnset || prevBasepath !== nextBasepath;
      const rewriteChanged = prevRewriteOption !== nextRewriteOption;
      if (basepathChanged || rewriteChanged) {
        this.basepath = nextBasepath;
        const rewrites = [];
        if (trimPath(nextBasepath) !== "") {
          rewrites.push(
            rewriteBasepath({
              basepath: nextBasepath
            })
          );
        }
        if (nextRewriteOption) {
          rewrites.push(nextRewriteOption);
        }
        this.rewrite = rewrites.length === 0 ? void 0 : rewrites.length === 1 ? rewrites[0] : composeRewrites(rewrites);
        if (this.history) {
          this.updateLatestLocation();
        }
        needsLocationUpdate = true;
      }
      if (needsLocationUpdate && this.__store) {
        this.__store.state = {
          ...this.state,
          location: this.latestLocation
        };
      }
    };
    this.updateLatestLocation = () => {
      this.latestLocation = this.parseLocation(
        this.history.location,
        this.latestLocation
      );
    };
    this.buildRouteTree = () => {
      const { routesById, routesByPath, flatRoutes } = processRouteTree({
        routeTree: this.routeTree,
        initRoute: (route, i2) => {
          route.init({
            originalIndex: i2
          });
        }
      });
      this.routesById = routesById;
      this.routesByPath = routesByPath;
      this.flatRoutes = flatRoutes;
      const notFoundRoute = this.options.notFoundRoute;
      if (notFoundRoute) {
        notFoundRoute.init({
          originalIndex: 99999999999
        });
        this.routesById[notFoundRoute.id] = notFoundRoute;
      }
    };
    this.subscribe = (eventType, fn) => {
      const listener = {
        eventType,
        fn
      };
      this.subscribers.add(listener);
      return () => {
        this.subscribers.delete(listener);
      };
    };
    this.emit = (routerEvent) => {
      this.subscribers.forEach((listener) => {
        if (listener.eventType === routerEvent.type) {
          listener.fn(routerEvent);
        }
      });
    };
    this.parseLocation = (locationToParse, previousLocation) => {
      const parse = ({
        href,
        state
      }) => {
        const fullUrl = new URL(href, this.origin);
        const url = executeRewriteInput(this.rewrite, fullUrl);
        const parsedSearch = this.options.parseSearch(url.search);
        const searchStr = this.options.stringifySearch(parsedSearch);
        url.search = searchStr;
        const fullPath = url.href.replace(url.origin, "");
        const { pathname, hash } = url;
        return {
          href: fullPath,
          publicHref: href,
          url: url.href,
          pathname,
          searchStr,
          search: replaceEqualDeep(previousLocation?.search, parsedSearch),
          hash: hash.split("#").reverse()[0] ?? "",
          state: replaceEqualDeep(previousLocation?.state, state)
        };
      };
      const location = parse(locationToParse);
      const { __tempLocation, __tempKey } = location.state;
      if (__tempLocation && (!__tempKey || __tempKey === this.tempLocationKey)) {
        const parsedTempLocation = parse(__tempLocation);
        parsedTempLocation.state.key = location.state.key;
        parsedTempLocation.state.__TSR_key = location.state.__TSR_key;
        delete parsedTempLocation.state.__tempLocation;
        return {
          ...parsedTempLocation,
          maskedLocation: location
        };
      }
      return location;
    };
    this.resolvePathWithBase = (from, path) => {
      const resolvedPath = resolvePath({
        base: from,
        to: cleanPath(path),
        trailingSlash: this.options.trailingSlash,
        parseCache: this.parsePathnameCache
      });
      return resolvedPath;
    };
    this.matchRoutes = (pathnameOrNext, locationSearchOrOpts, opts) => {
      if (typeof pathnameOrNext === "string") {
        return this.matchRoutesInternal(
          {
            pathname: pathnameOrNext,
            search: locationSearchOrOpts
          },
          opts
        );
      }
      return this.matchRoutesInternal(pathnameOrNext, locationSearchOrOpts);
    };
    this.parsePathnameCache = createLRUCache(1e3);
    this.getMatchedRoutes = (pathname, routePathname) => {
      return getMatchedRoutes({
        pathname,
        routePathname,
        caseSensitive: this.options.caseSensitive,
        routesByPath: this.routesByPath,
        routesById: this.routesById,
        flatRoutes: this.flatRoutes,
        parseCache: this.parsePathnameCache
      });
    };
    this.cancelMatch = (id) => {
      const match = this.getMatch(id);
      if (!match) return;
      match.abortController.abort();
      clearTimeout(match._nonReactive.pendingTimeout);
      match._nonReactive.pendingTimeout = void 0;
    };
    this.cancelMatches = () => {
      this.state.pendingMatches?.forEach((match) => {
        this.cancelMatch(match.id);
      });
    };
    this.buildLocation = (opts) => {
      const build = (dest = {}) => {
        const currentLocation = dest._fromLocation || this.latestLocation;
        const allCurrentLocationMatches = this.matchRoutes(currentLocation, {
          _buildLocation: true
        });
        const lastMatch = last(allCurrentLocationMatches);
        if (dest.from && false) ;
        const defaultedFromPath = dest.unsafeRelative === "path" ? currentLocation.pathname : dest.from ?? lastMatch.fullPath;
        const fromPath = this.resolvePathWithBase(defaultedFromPath, ".");
        const fromSearch = lastMatch.search;
        const fromParams = { ...lastMatch.params };
        const nextTo = dest.to ? this.resolvePathWithBase(fromPath, `${dest.to}`) : this.resolvePathWithBase(fromPath, ".");
        const nextParams = dest.params === false || dest.params === null ? {} : (dest.params ?? true) === true ? fromParams : Object.assign(
          fromParams,
          functionalUpdate(dest.params, fromParams)
        );
        const interpolatedNextTo = interpolatePath({
          path: nextTo,
          params: nextParams,
          parseCache: this.parsePathnameCache
        }).interpolatedPath;
        const destRoutes = this.matchRoutes(interpolatedNextTo, void 0, {
          _buildLocation: true
        }).map((d2) => this.looseRoutesById[d2.routeId]);
        if (Object.keys(nextParams).length > 0) {
          for (const route of destRoutes) {
            const fn = route.options.params?.stringify ?? route.options.stringifyParams;
            if (fn) {
              Object.assign(nextParams, fn(nextParams));
            }
          }
        }
        const nextPathname = interpolatePath({
          // Use the original template path for interpolation
          // This preserves the original parameter syntax including optional parameters
          path: nextTo,
          params: nextParams,
          leaveWildcards: false,
          leaveParams: opts.leaveParams,
          decodeCharMap: this.pathParamsDecodeCharMap,
          parseCache: this.parsePathnameCache
        }).interpolatedPath;
        let nextSearch = fromSearch;
        if (opts._includeValidateSearch && this.options.search?.strict) {
          const validatedSearch = {};
          destRoutes.forEach((route) => {
            if (route.options.validateSearch) {
              try {
                Object.assign(
                  validatedSearch,
                  validateSearch(route.options.validateSearch, {
                    ...validatedSearch,
                    ...nextSearch
                  })
                );
              } catch {
              }
            }
          });
          nextSearch = validatedSearch;
        }
        nextSearch = applySearchMiddleware({
          search: nextSearch,
          dest,
          destRoutes,
          _includeValidateSearch: opts._includeValidateSearch
        });
        nextSearch = replaceEqualDeep(fromSearch, nextSearch);
        const searchStr = this.options.stringifySearch(nextSearch);
        const hash = dest.hash === true ? currentLocation.hash : dest.hash ? functionalUpdate(dest.hash, currentLocation.hash) : void 0;
        const hashStr = hash ? `#${hash}` : "";
        let nextState = dest.state === true ? currentLocation.state : dest.state ? functionalUpdate(dest.state, currentLocation.state) : {};
        nextState = replaceEqualDeep(currentLocation.state, nextState);
        const fullPath = `${nextPathname}${searchStr}${hashStr}`;
        const url = new URL(fullPath, this.origin);
        const rewrittenUrl = executeRewriteOutput(this.rewrite, url);
        return {
          publicHref: rewrittenUrl.pathname + rewrittenUrl.search + rewrittenUrl.hash,
          href: fullPath,
          url: rewrittenUrl.href,
          pathname: nextPathname,
          search: nextSearch,
          searchStr,
          state: nextState,
          hash: hash ?? "",
          unmaskOnReload: dest.unmaskOnReload
        };
      };
      const buildWithMatches = (dest = {}, maskedDest) => {
        const next = build(dest);
        let maskedNext = maskedDest ? build(maskedDest) : void 0;
        if (!maskedNext) {
          let params = {};
          const foundMask = this.options.routeMasks?.find((d2) => {
            const match = matchPathname(
              next.pathname,
              {
                to: d2.from,
                caseSensitive: false,
                fuzzy: false
              },
              this.parsePathnameCache
            );
            if (match) {
              params = match;
              return true;
            }
            return false;
          });
          if (foundMask) {
            const { from: _from, ...maskProps } = foundMask;
            maskedDest = {
              from: opts.from,
              ...maskProps,
              params
            };
            maskedNext = build(maskedDest);
          }
        }
        if (maskedNext) {
          next.maskedLocation = maskedNext;
        }
        return next;
      };
      if (opts.mask) {
        return buildWithMatches(opts, {
          from: opts.from,
          ...opts.mask
        });
      }
      return buildWithMatches(opts);
    };
    this.commitLocation = ({
      viewTransition,
      ignoreBlocker,
      ...next
    }) => {
      const isSameState = () => {
        const ignoredProps = [
          "key",
          // TODO: Remove in v2 - use __TSR_key instead
          "__TSR_key",
          "__TSR_index",
          "__hashScrollIntoViewOptions"
        ];
        ignoredProps.forEach((prop) => {
          next.state[prop] = this.latestLocation.state[prop];
        });
        const isEqual = deepEqual(next.state, this.latestLocation.state);
        ignoredProps.forEach((prop) => {
          delete next.state[prop];
        });
        return isEqual;
      };
      const isSameUrl = trimPathRight(this.latestLocation.href) === trimPathRight(next.href);
      const previousCommitPromise = this.commitLocationPromise;
      this.commitLocationPromise = createControlledPromise(() => {
        previousCommitPromise?.resolve();
      });
      if (isSameUrl && isSameState()) {
        this.load();
      } else {
        let { maskedLocation, hashScrollIntoView, ...nextHistory } = next;
        if (maskedLocation) {
          nextHistory = {
            ...maskedLocation,
            state: {
              ...maskedLocation.state,
              __tempKey: void 0,
              __tempLocation: {
                ...nextHistory,
                search: nextHistory.searchStr,
                state: {
                  ...nextHistory.state,
                  __tempKey: void 0,
                  __tempLocation: void 0,
                  __TSR_key: void 0,
                  key: void 0
                  // TODO: Remove in v2 - use __TSR_key instead
                }
              }
            }
          };
          if (nextHistory.unmaskOnReload ?? this.options.unmaskOnReload ?? false) {
            nextHistory.state.__tempKey = this.tempLocationKey;
          }
        }
        nextHistory.state.__hashScrollIntoViewOptions = hashScrollIntoView ?? this.options.defaultHashScrollIntoView ?? true;
        this.shouldViewTransition = viewTransition;
        this.history[next.replace ? "replace" : "push"](
          nextHistory.publicHref,
          nextHistory.state,
          { ignoreBlocker }
        );
      }
      this.resetNextScroll = next.resetScroll ?? true;
      if (!this.history.subscribers.size) {
        this.load();
      }
      return this.commitLocationPromise;
    };
    this.buildAndCommitLocation = ({
      replace,
      resetScroll,
      hashScrollIntoView,
      viewTransition,
      ignoreBlocker,
      href,
      ...rest
    } = {}) => {
      if (href) {
        const currentIndex = this.history.location.state.__TSR_index;
        const parsed = parseHref(href, {
          __TSR_index: replace ? currentIndex : currentIndex + 1
        });
        rest.to = parsed.pathname;
        rest.search = this.options.parseSearch(parsed.search);
        rest.hash = parsed.hash.slice(1);
      }
      const location = this.buildLocation({
        ...rest,
        _includeValidateSearch: true
      });
      return this.commitLocation({
        ...location,
        viewTransition,
        replace,
        resetScroll,
        hashScrollIntoView,
        ignoreBlocker
      });
    };
    this.navigate = ({ to, reloadDocument, href, ...rest }) => {
      if (!reloadDocument && href) {
        try {
          new URL(`${href}`);
          reloadDocument = true;
        } catch {
        }
      }
      if (reloadDocument) {
        if (!href) {
          const location = this.buildLocation({ to, ...rest });
          href = location.url;
        }
        if (rest.replace) {
          window.location.replace(href);
        } else {
          window.location.href = href;
        }
        return Promise.resolve();
      }
      return this.buildAndCommitLocation({
        ...rest,
        href,
        to,
        _isNavigate: true
      });
    };
    this.beforeLoad = () => {
      this.cancelMatches();
      this.updateLatestLocation();
      if (this.isServer) {
        const nextLocation = this.buildLocation({
          to: this.latestLocation.pathname,
          search: true,
          params: true,
          hash: true,
          state: true,
          _includeValidateSearch: true
        });
        const normalizeUrl = (url) => {
          try {
            return encodeURI(decodeURI(url));
          } catch {
            return url;
          }
        };
        if (trimPath(normalizeUrl(this.latestLocation.href)) !== trimPath(normalizeUrl(nextLocation.href))) {
          throw redirect({ href: nextLocation.href });
        }
      }
      const pendingMatches = this.matchRoutes(this.latestLocation);
      this.__store.setState((s3) => ({
        ...s3,
        status: "pending",
        statusCode: 200,
        isLoading: true,
        location: this.latestLocation,
        pendingMatches,
        // If a cached moved to pendingMatches, remove it from cachedMatches
        cachedMatches: s3.cachedMatches.filter(
          (d2) => !pendingMatches.some((e) => e.id === d2.id)
        )
      }));
    };
    this.load = async (opts) => {
      let redirect2;
      let notFound;
      let loadPromise;
      loadPromise = new Promise((resolve) => {
        this.startTransition(async () => {
          try {
            this.beforeLoad();
            const next = this.latestLocation;
            const prevLocation = this.state.resolvedLocation;
            if (!this.state.redirect) {
              this.emit({
                type: "onBeforeNavigate",
                ...getLocationChangeInfo({
                  resolvedLocation: prevLocation,
                  location: next
                })
              });
            }
            this.emit({
              type: "onBeforeLoad",
              ...getLocationChangeInfo({
                resolvedLocation: prevLocation,
                location: next
              })
            });
            await loadMatches({
              router: this,
              sync: opts?.sync,
              matches: this.state.pendingMatches,
              location: next,
              updateMatch: this.updateMatch,
              // eslint-disable-next-line @typescript-eslint/require-await
              onReady: async () => {
                this.startViewTransition(async () => {
                  let exitingMatches;
                  let enteringMatches;
                  let stayingMatches;
                  batch(() => {
                    this.__store.setState((s3) => {
                      const previousMatches = s3.matches;
                      const newMatches = s3.pendingMatches || s3.matches;
                      exitingMatches = previousMatches.filter(
                        (match) => !newMatches.some((d2) => d2.id === match.id)
                      );
                      enteringMatches = newMatches.filter(
                        (match) => !previousMatches.some((d2) => d2.id === match.id)
                      );
                      stayingMatches = previousMatches.filter(
                        (match) => newMatches.some((d2) => d2.id === match.id)
                      );
                      return {
                        ...s3,
                        isLoading: false,
                        loadedAt: Date.now(),
                        matches: newMatches,
                        pendingMatches: void 0,
                        cachedMatches: [
                          ...s3.cachedMatches,
                          ...exitingMatches.filter((d2) => d2.status !== "error")
                        ]
                      };
                    });
                    this.clearExpiredCache();
                  });
                  [
                    [exitingMatches, "onLeave"],
                    [enteringMatches, "onEnter"],
                    [stayingMatches, "onStay"]
                  ].forEach(([matches, hook]) => {
                    matches.forEach((match) => {
                      this.looseRoutesById[match.routeId].options[hook]?.(match);
                    });
                  });
                });
              }
            });
          } catch (err) {
            if (isRedirect(err)) {
              redirect2 = err;
              if (!this.isServer) {
                this.navigate({
                  ...redirect2.options,
                  replace: true,
                  ignoreBlocker: true
                });
              }
            } else if (isNotFound(err)) {
              notFound = err;
            }
            this.__store.setState((s3) => ({
              ...s3,
              statusCode: redirect2 ? redirect2.status : notFound ? 404 : s3.matches.some((d2) => d2.status === "error") ? 500 : 200,
              redirect: redirect2
            }));
          }
          if (this.latestLoadPromise === loadPromise) {
            this.commitLocationPromise?.resolve();
            this.latestLoadPromise = void 0;
            this.commitLocationPromise = void 0;
          }
          resolve();
        });
      });
      this.latestLoadPromise = loadPromise;
      await loadPromise;
      while (this.latestLoadPromise && loadPromise !== this.latestLoadPromise) {
        await this.latestLoadPromise;
      }
      if (this.hasNotFoundMatch()) {
        this.__store.setState((s3) => ({
          ...s3,
          statusCode: 404
        }));
      }
    };
    this.startViewTransition = (fn) => {
      const shouldViewTransition = this.shouldViewTransition ?? this.options.defaultViewTransition;
      delete this.shouldViewTransition;
      if (shouldViewTransition && typeof document !== "undefined" && "startViewTransition" in document && typeof document.startViewTransition === "function") {
        let startViewTransitionParams;
        if (typeof shouldViewTransition === "object" && this.isViewTransitionTypesSupported) {
          const next = this.latestLocation;
          const prevLocation = this.state.resolvedLocation;
          const resolvedViewTransitionTypes = typeof shouldViewTransition.types === "function" ? shouldViewTransition.types(
            getLocationChangeInfo({
              resolvedLocation: prevLocation,
              location: next
            })
          ) : shouldViewTransition.types;
          startViewTransitionParams = {
            update: fn,
            types: resolvedViewTransitionTypes
          };
        } else {
          startViewTransitionParams = fn;
        }
        document.startViewTransition(startViewTransitionParams);
      } else {
        fn();
      }
    };
    this.updateMatch = (id, updater) => {
      const matchesKey = this.state.pendingMatches?.some((d2) => d2.id === id) ? "pendingMatches" : this.state.matches.some((d2) => d2.id === id) ? "matches" : this.state.cachedMatches.some((d2) => d2.id === id) ? "cachedMatches" : "";
      if (matchesKey) {
        this.__store.setState((s3) => ({
          ...s3,
          [matchesKey]: s3[matchesKey]?.map((d2) => d2.id === id ? updater(d2) : d2)
        }));
      }
    };
    this.getMatch = (matchId) => {
      const findFn = (d2) => d2.id === matchId;
      return this.state.cachedMatches.find(findFn) ?? this.state.pendingMatches?.find(findFn) ?? this.state.matches.find(findFn);
    };
    this.invalidate = (opts) => {
      const invalidate = (d2) => {
        if (opts?.filter?.(d2) ?? true) {
          return {
            ...d2,
            invalid: true,
            ...opts?.forcePending || d2.status === "error" ? { status: "pending", error: void 0 } : void 0
          };
        }
        return d2;
      };
      this.__store.setState((s3) => ({
        ...s3,
        matches: s3.matches.map(invalidate),
        cachedMatches: s3.cachedMatches.map(invalidate),
        pendingMatches: s3.pendingMatches?.map(invalidate)
      }));
      this.shouldViewTransition = false;
      return this.load({ sync: opts?.sync });
    };
    this.resolveRedirect = (redirect2) => {
      if (!redirect2.options.href) {
        const location = this.buildLocation(redirect2.options);
        let href = location.url;
        if (this.origin && href.startsWith(this.origin)) {
          href = href.replace(this.origin, "") || "/";
        }
        redirect2.options.href = location.href;
        redirect2.headers.set("Location", href);
      }
      if (!redirect2.headers.get("Location")) {
        redirect2.headers.set("Location", redirect2.options.href);
      }
      return redirect2;
    };
    this.clearCache = (opts) => {
      const filter = opts?.filter;
      if (filter !== void 0) {
        this.__store.setState((s3) => {
          return {
            ...s3,
            cachedMatches: s3.cachedMatches.filter(
              (m2) => !filter(m2)
            )
          };
        });
      } else {
        this.__store.setState((s3) => {
          return {
            ...s3,
            cachedMatches: []
          };
        });
      }
    };
    this.clearExpiredCache = () => {
      const filter = (d2) => {
        const route = this.looseRoutesById[d2.routeId];
        if (!route.options.loader) {
          return true;
        }
        const gcTime = (d2.preload ? route.options.preloadGcTime ?? this.options.defaultPreloadGcTime : route.options.gcTime ?? this.options.defaultGcTime) ?? 5 * 60 * 1e3;
        const isError = d2.status === "error";
        if (isError) return true;
        const gcEligible = Date.now() - d2.updatedAt >= gcTime;
        return gcEligible;
      };
      this.clearCache({ filter });
    };
    this.loadRouteChunk = loadRouteChunk;
    this.preloadRoute = async (opts) => {
      const next = this.buildLocation(opts);
      let matches = this.matchRoutes(next, {
        throwOnError: true,
        preload: true,
        dest: opts
      });
      const activeMatchIds = new Set(
        [...this.state.matches, ...this.state.pendingMatches ?? []].map(
          (d2) => d2.id
        )
      );
      const loadedMatchIds = /* @__PURE__ */ new Set([
        ...activeMatchIds,
        ...this.state.cachedMatches.map((d2) => d2.id)
      ]);
      batch(() => {
        matches.forEach((match) => {
          if (!loadedMatchIds.has(match.id)) {
            this.__store.setState((s3) => ({
              ...s3,
              cachedMatches: [...s3.cachedMatches, match]
            }));
          }
        });
      });
      try {
        matches = await loadMatches({
          router: this,
          matches,
          location: next,
          preload: true,
          updateMatch: (id, updater) => {
            if (activeMatchIds.has(id)) {
              matches = matches.map((d2) => d2.id === id ? updater(d2) : d2);
            } else {
              this.updateMatch(id, updater);
            }
          }
        });
        return matches;
      } catch (err) {
        if (isRedirect(err)) {
          if (err.options.reloadDocument) {
            return void 0;
          }
          return await this.preloadRoute({
            ...err.options,
            _fromLocation: next
          });
        }
        if (!isNotFound(err)) {
          console.error(err);
        }
        return void 0;
      }
    };
    this.matchRoute = (location, opts) => {
      const matchLocation = {
        ...location,
        to: location.to ? this.resolvePathWithBase(
          location.from || "",
          location.to
        ) : void 0,
        params: location.params || {},
        leaveParams: true
      };
      const next = this.buildLocation(matchLocation);
      if (opts?.pending && this.state.status !== "pending") {
        return false;
      }
      const pending = opts?.pending === void 0 ? !this.state.isLoading : opts.pending;
      const baseLocation = pending ? this.latestLocation : this.state.resolvedLocation || this.state.location;
      const match = matchPathname(
        baseLocation.pathname,
        {
          ...opts,
          to: next.pathname
        },
        this.parsePathnameCache
      );
      if (!match) {
        return false;
      }
      if (location.params) {
        if (!deepEqual(match, location.params, { partial: true })) {
          return false;
        }
      }
      if (match && (opts?.includeSearch ?? true)) {
        return deepEqual(baseLocation.search, next.search, { partial: true }) ? match : false;
      }
      return match;
    };
    this.hasNotFoundMatch = () => {
      return this.__store.state.matches.some(
        (d2) => d2.status === "notFound" || d2.globalNotFound
      );
    };
    this.update({
      defaultPreloadDelay: 50,
      defaultPendingMs: 1e3,
      defaultPendingMinMs: 500,
      context: void 0,
      ...options,
      caseSensitive: options.caseSensitive ?? false,
      notFoundMode: options.notFoundMode ?? "fuzzy",
      stringifySearch: options.stringifySearch ?? defaultStringifySearch,
      parseSearch: options.parseSearch ?? defaultParseSearch
    });
    if (typeof document !== "undefined") {
      self.__TSR_ROUTER__ = this;
    }
  }
  isShell() {
    return !!this.options.isShell;
  }
  isPrerendering() {
    return !!this.options.isPrerendering;
  }
  get state() {
    return this.__store.state;
  }
  get looseRoutesById() {
    return this.routesById;
  }
  matchRoutesInternal(next, opts) {
    const { foundRoute, matchedRoutes, routeParams } = this.getMatchedRoutes(
      next.pathname,
      opts?.dest?.to
    );
    let isGlobalNotFound = false;
    if (
      // If we found a route, and it's not an index route and we have left over path
      foundRoute ? foundRoute.path !== "/" && routeParams["**"] : (
        // Or if we didn't find a route and we have left over path
        trimPathRight(next.pathname)
      )
    ) {
      if (this.options.notFoundRoute) {
        matchedRoutes.push(this.options.notFoundRoute);
      } else {
        isGlobalNotFound = true;
      }
    }
    const globalNotFoundRouteId = (() => {
      if (!isGlobalNotFound) {
        return void 0;
      }
      if (this.options.notFoundMode !== "root") {
        for (let i2 = matchedRoutes.length - 1; i2 >= 0; i2--) {
          const route = matchedRoutes[i2];
          if (route.children) {
            return route.id;
          }
        }
      }
      return rootRouteId;
    })();
    const matches = [];
    const getParentContext = (parentMatch) => {
      const parentMatchId = parentMatch?.id;
      const parentContext = !parentMatchId ? this.options.context ?? void 0 : parentMatch.context ?? this.options.context ?? void 0;
      return parentContext;
    };
    matchedRoutes.forEach((route, index) => {
      const parentMatch = matches[index - 1];
      const [preMatchSearch, strictMatchSearch, searchError] = (() => {
        const parentSearch = parentMatch?.search ?? next.search;
        const parentStrictSearch = parentMatch?._strictSearch ?? void 0;
        try {
          const strictSearch = validateSearch(route.options.validateSearch, { ...parentSearch }) ?? void 0;
          return [
            {
              ...parentSearch,
              ...strictSearch
            },
            { ...parentStrictSearch, ...strictSearch },
            void 0
          ];
        } catch (err) {
          let searchParamError = err;
          if (!(err instanceof SearchParamError)) {
            searchParamError = new SearchParamError(err.message, {
              cause: err
            });
          }
          if (opts?.throwOnError) {
            throw searchParamError;
          }
          return [parentSearch, {}, searchParamError];
        }
      })();
      const loaderDeps = route.options.loaderDeps?.({
        search: preMatchSearch
      }) ?? "";
      const loaderDepsHash = loaderDeps ? JSON.stringify(loaderDeps) : "";
      const { interpolatedPath, usedParams } = interpolatePath({
        path: route.fullPath,
        params: routeParams,
        decodeCharMap: this.pathParamsDecodeCharMap
      });
      const matchId = interpolatePath({
        path: route.id,
        params: routeParams,
        leaveWildcards: true,
        decodeCharMap: this.pathParamsDecodeCharMap,
        parseCache: this.parsePathnameCache
      }).interpolatedPath + loaderDepsHash;
      const existingMatch = this.getMatch(matchId);
      const previousMatch = this.state.matches.find(
        (d2) => d2.routeId === route.id
      );
      const strictParams = existingMatch?._strictParams ?? usedParams;
      let paramsError = void 0;
      if (!existingMatch) {
        const strictParseParams = route.options.params?.parse ?? route.options.parseParams;
        if (strictParseParams) {
          try {
            Object.assign(
              strictParams,
              strictParseParams(strictParams)
            );
          } catch (err) {
            paramsError = new PathParamError(err.message, {
              cause: err
            });
            if (opts?.throwOnError) {
              throw paramsError;
            }
          }
        }
      }
      Object.assign(routeParams, strictParams);
      const cause = previousMatch ? "stay" : "enter";
      let match;
      if (existingMatch) {
        match = {
          ...existingMatch,
          cause,
          params: previousMatch ? replaceEqualDeep(previousMatch.params, routeParams) : routeParams,
          _strictParams: strictParams,
          search: previousMatch ? replaceEqualDeep(previousMatch.search, preMatchSearch) : replaceEqualDeep(existingMatch.search, preMatchSearch),
          _strictSearch: strictMatchSearch
        };
      } else {
        const status = route.options.loader || route.options.beforeLoad || route.lazyFn || routeNeedsPreload(route) ? "pending" : "success";
        match = {
          id: matchId,
          index,
          routeId: route.id,
          params: previousMatch ? replaceEqualDeep(previousMatch.params, routeParams) : routeParams,
          _strictParams: strictParams,
          pathname: interpolatedPath,
          updatedAt: Date.now(),
          search: previousMatch ? replaceEqualDeep(previousMatch.search, preMatchSearch) : preMatchSearch,
          _strictSearch: strictMatchSearch,
          searchError: void 0,
          status,
          isFetching: false,
          error: void 0,
          paramsError,
          __routeContext: void 0,
          _nonReactive: {
            loadPromise: createControlledPromise()
          },
          __beforeLoadContext: void 0,
          context: {},
          abortController: new AbortController(),
          fetchCount: 0,
          cause,
          loaderDeps: previousMatch ? replaceEqualDeep(previousMatch.loaderDeps, loaderDeps) : loaderDeps,
          invalid: false,
          preload: false,
          links: void 0,
          scripts: void 0,
          headScripts: void 0,
          meta: void 0,
          staticData: route.options.staticData || {},
          fullPath: route.fullPath
        };
      }
      if (!opts?.preload) {
        match.globalNotFound = globalNotFoundRouteId === route.id;
      }
      match.searchError = searchError;
      const parentContext = getParentContext(parentMatch);
      match.context = {
        ...parentContext,
        ...match.__routeContext,
        ...match.__beforeLoadContext
      };
      matches.push(match);
    });
    matches.forEach((match, index) => {
      const route = this.looseRoutesById[match.routeId];
      const existingMatch = this.getMatch(match.id);
      if (!existingMatch && opts?._buildLocation !== true) {
        const parentMatch = matches[index - 1];
        const parentContext = getParentContext(parentMatch);
        if (route.options.context) {
          const contextFnContext = {
            deps: match.loaderDeps,
            params: match.params,
            context: parentContext ?? {},
            location: next,
            navigate: (opts2) => this.navigate({ ...opts2, _fromLocation: next }),
            buildLocation: this.buildLocation,
            cause: match.cause,
            abortController: match.abortController,
            preload: !!match.preload,
            matches
          };
          match.__routeContext = route.options.context(contextFnContext) ?? void 0;
        }
        match.context = {
          ...parentContext,
          ...match.__routeContext,
          ...match.__beforeLoadContext
        };
      }
    });
    return matches;
  }
}
class SearchParamError extends Error {
}
class PathParamError extends Error {
}
function getInitialRouterState(location) {
  return {
    loadedAt: 0,
    isLoading: false,
    isTransitioning: false,
    status: "idle",
    resolvedLocation: void 0,
    location,
    matches: [],
    pendingMatches: [],
    cachedMatches: [],
    statusCode: 200
  };
}
function validateSearch(validateSearch2, input) {
  if (validateSearch2 == null) return {};
  if ("~standard" in validateSearch2) {
    const result = validateSearch2["~standard"].validate(input);
    if (result instanceof Promise)
      throw new SearchParamError("Async validation not supported");
    if (result.issues)
      throw new SearchParamError(JSON.stringify(result.issues, void 0, 2), {
        cause: result
      });
    return result.value;
  }
  if ("parse" in validateSearch2) {
    return validateSearch2.parse(input);
  }
  if (typeof validateSearch2 === "function") {
    return validateSearch2(input);
  }
  return {};
}
function getMatchedRoutes({
  pathname,
  routePathname,
  caseSensitive,
  routesByPath,
  routesById,
  flatRoutes,
  parseCache
}) {
  let routeParams = {};
  const trimmedPath = trimPathRight(pathname);
  const getMatchedParams = (route) => {
    const result = matchPathname(
      trimmedPath,
      {
        to: route.fullPath,
        caseSensitive: route.options?.caseSensitive ?? caseSensitive,
        // we need fuzzy matching for `notFoundMode: 'fuzzy'`
        fuzzy: true
      },
      parseCache
    );
    return result;
  };
  let foundRoute = routePathname !== void 0 ? routesByPath[routePathname] : void 0;
  if (foundRoute) {
    routeParams = getMatchedParams(foundRoute);
  } else {
    let fuzzyMatch = void 0;
    for (const route of flatRoutes) {
      const matchedParams = getMatchedParams(route);
      if (matchedParams) {
        if (route.path !== "/" && matchedParams["**"]) {
          if (!fuzzyMatch) {
            fuzzyMatch = { foundRoute: route, routeParams: matchedParams };
          }
        } else {
          foundRoute = route;
          routeParams = matchedParams;
          break;
        }
      }
    }
    if (!foundRoute && fuzzyMatch) {
      foundRoute = fuzzyMatch.foundRoute;
      routeParams = fuzzyMatch.routeParams;
    }
  }
  let routeCursor = foundRoute || routesById[rootRouteId];
  const matchedRoutes = [routeCursor];
  while (routeCursor.parentRoute) {
    routeCursor = routeCursor.parentRoute;
    matchedRoutes.push(routeCursor);
  }
  matchedRoutes.reverse();
  return { matchedRoutes, routeParams, foundRoute };
}
function applySearchMiddleware({
  search,
  dest,
  destRoutes,
  _includeValidateSearch
}) {
  const allMiddlewares = destRoutes.reduce(
    (acc, route) => {
      const middlewares = [];
      if ("search" in route.options) {
        if (route.options.search?.middlewares) {
          middlewares.push(...route.options.search.middlewares);
        }
      } else if (route.options.preSearchFilters || route.options.postSearchFilters) {
        const legacyMiddleware = ({
          search: search2,
          next
        }) => {
          let nextSearch = search2;
          if ("preSearchFilters" in route.options && route.options.preSearchFilters) {
            nextSearch = route.options.preSearchFilters.reduce(
              (prev, next2) => next2(prev),
              search2
            );
          }
          const result = next(nextSearch);
          if ("postSearchFilters" in route.options && route.options.postSearchFilters) {
            return route.options.postSearchFilters.reduce(
              (prev, next2) => next2(prev),
              result
            );
          }
          return result;
        };
        middlewares.push(legacyMiddleware);
      }
      if (_includeValidateSearch && route.options.validateSearch) {
        const validate = ({ search: search2, next }) => {
          const result = next(search2);
          try {
            const validatedSearch = {
              ...result,
              ...validateSearch(route.options.validateSearch, result) ?? void 0
            };
            return validatedSearch;
          } catch {
            return result;
          }
        };
        middlewares.push(validate);
      }
      return acc.concat(middlewares);
    },
    []
  ) ?? [];
  const final = ({ search: search2 }) => {
    if (!dest.search) {
      return {};
    }
    if (dest.search === true) {
      return search2;
    }
    return functionalUpdate(dest.search, search2);
  };
  allMiddlewares.push(final);
  const applyNext = (index, currentSearch) => {
    if (index >= allMiddlewares.length) {
      return currentSearch;
    }
    const middleware = allMiddlewares[index];
    const next = (newSearch) => {
      return applyNext(index + 1, newSearch);
    };
    return middleware({ search: currentSearch, next });
  };
  return applyNext(0, search);
}
var R$1 = ((a) => (a[a.AggregateError = 1] = "AggregateError", a[a.ArrowFunction = 2] = "ArrowFunction", a[a.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", a[a.ObjectAssign = 8] = "ObjectAssign", a[a.BigIntTypedArray = 16] = "BigIntTypedArray", a))(R$1 || {});
function Nr$1(o2) {
  switch (o2) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return;
  }
}
function d$1(o2) {
  let e = "", r = 0, t;
  for (let n = 0, a = o2.length; n < a; n++) t = Nr$1(o2[n]), t && (e += o2.slice(r, n) + t, r = n + 1);
  return r === 0 ? e = o2 : e += o2.slice(r), e;
}
var O$1 = "__SEROVAL_REFS__", Q = "$R", ae = `self.${Q}`;
function xr(o2) {
  return o2 == null ? `${ae}=${ae}||[]` : `(${ae}=${ae}||{})["${d$1(o2)}"]=[]`;
}
function f$1(o2, e) {
  if (!o2) throw e;
}
var Be$1 = /* @__PURE__ */ new Map(), C$1 = /* @__PURE__ */ new Map();
function je$1(o2) {
  return Be$1.has(o2);
}
function Ke$1(o2) {
  return f$1(je$1(o2), new ie$1(o2)), Be$1.get(o2);
}
typeof globalThis != "undefined" ? Object.defineProperty(globalThis, O$1, { value: C$1, configurable: true, writable: false, enumerable: false }) : typeof self != "undefined" ? Object.defineProperty(self, O$1, { value: C$1, configurable: true, writable: false, enumerable: false }) : typeof global != "undefined" && Object.defineProperty(global, O$1, { value: C$1, configurable: true, writable: false, enumerable: false });
function Hr(o2) {
  return o2;
}
function Ye$1(o2, e) {
  for (let r = 0, t = e.length; r < t; r++) {
    let n = e[r];
    o2.has(n) || (o2.add(n), n.extends && Ye$1(o2, n.extends));
  }
}
function m$1(o2) {
  if (o2) {
    let e = /* @__PURE__ */ new Set();
    return Ye$1(e, o2), [...e];
  }
}
var $e = { 0: "Symbol.asyncIterator", 1: "Symbol.hasInstance", 2: "Symbol.isConcatSpreadable", 3: "Symbol.iterator", 4: "Symbol.match", 5: "Symbol.matchAll", 6: "Symbol.replace", 7: "Symbol.search", 8: "Symbol.species", 9: "Symbol.split", 10: "Symbol.toPrimitive", 11: "Symbol.toStringTag", 12: "Symbol.unscopables" }, ce$1 = { [Symbol.asyncIterator]: 0, [Symbol.hasInstance]: 1, [Symbol.isConcatSpreadable]: 2, [Symbol.iterator]: 3, [Symbol.match]: 4, [Symbol.matchAll]: 5, [Symbol.replace]: 6, [Symbol.search]: 7, [Symbol.species]: 8, [Symbol.split]: 9, [Symbol.toPrimitive]: 10, [Symbol.toStringTag]: 11, [Symbol.unscopables]: 12 }, qe = { 2: "!0", 3: "!1", 1: "void 0", 0: "null", 4: "-0", 5: "1/0", 6: "-1/0", 7: "0/0" };
var ue$1 = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, s$1 = void 0;
function u$2(o2, e, r, t, n, a, i2, l2, c2, p2, h2, X2) {
  return { t: o2, i: e, s: r, l: t, c: n, m: a, p: i2, e: l2, a: c2, f: p2, b: h2, o: X2 };
}
function x$1(o2) {
  return u$2(2, s$1, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
var I$1 = x$1(2), A$1 = x$1(3), pe$1 = x$1(1), de$1 = x$1(0), Xe$1 = x$1(4), Qe$1 = x$1(5), er$1 = x$1(6), rr$1 = x$1(7);
function me$1(o2) {
  return o2 instanceof EvalError ? 1 : o2 instanceof RangeError ? 2 : o2 instanceof ReferenceError ? 3 : o2 instanceof SyntaxError ? 4 : o2 instanceof TypeError ? 5 : o2 instanceof URIError ? 6 : 0;
}
function wr$1(o2) {
  let e = ue$1[me$1(o2)];
  return o2.name !== e ? { name: o2.name } : o2.constructor.name !== e ? { name: o2.constructor.name } : {};
}
function j$1(o2, e) {
  let r = wr$1(o2), t = Object.getOwnPropertyNames(o2);
  for (let n = 0, a = t.length, i2; n < a; n++) i2 = t[n], i2 !== "name" && i2 !== "message" && (i2 === "stack" ? e & 4 && (r = r || {}, r[i2] = o2[i2]) : (r = r || {}, r[i2] = o2[i2]));
  return r;
}
function fe$1(o2) {
  return Object.isFrozen(o2) ? 3 : Object.isSealed(o2) ? 2 : Object.isExtensible(o2) ? 0 : 1;
}
function ge$1(o2) {
  switch (o2) {
    case Number.POSITIVE_INFINITY:
      return Qe$1;
    case Number.NEGATIVE_INFINITY:
      return er$1;
  }
  return o2 !== o2 ? rr$1 : Object.is(o2, -0) ? Xe$1 : u$2(0, s$1, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function w$1(o2) {
  return u$2(1, s$1, d$1(o2), s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function Se$1(o2) {
  return u$2(3, s$1, "" + o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function sr$1(o2) {
  return u$2(4, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function he$1(o2, e) {
  let r = e.valueOf();
  return u$2(5, o2, r !== r ? "" : e.toISOString(), s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function ye$1(o2, e) {
  return u$2(6, o2, s$1, s$1, d$1(e.source), e.flags, s$1, s$1, s$1, s$1, s$1, s$1);
}
function ve$1(o2, e) {
  let r = new Uint8Array(e), t = r.length, n = new Array(t);
  for (let a = 0; a < t; a++) n[a] = r[a];
  return u$2(19, o2, n, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function or$1(o2, e) {
  return u$2(17, o2, ce$1[e], s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function nr$1(o2, e) {
  return u$2(18, o2, d$1(Ke$1(e)), s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function _$1(o2, e, r) {
  return u$2(25, o2, r, s$1, d$1(e), s$1, s$1, s$1, s$1, s$1, s$1, s$1);
}
function Ne$1(o2, e, r) {
  return u$2(9, o2, s$1, e.length, s$1, s$1, s$1, s$1, r, s$1, s$1, fe$1(e));
}
function be$1(o2, e) {
  return u$2(21, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, e, s$1, s$1);
}
function xe$1(o2, e, r) {
  return u$2(15, o2, s$1, e.length, e.constructor.name, s$1, s$1, s$1, s$1, r, e.byteOffset, s$1);
}
function Ie$1(o2, e, r) {
  return u$2(16, o2, s$1, e.length, e.constructor.name, s$1, s$1, s$1, s$1, r, e.byteOffset, s$1);
}
function Ae$1(o2, e, r) {
  return u$2(20, o2, s$1, e.byteLength, s$1, s$1, s$1, s$1, s$1, r, e.byteOffset, s$1);
}
function we$1(o2, e, r) {
  return u$2(13, o2, me$1(e), s$1, s$1, d$1(e.message), r, s$1, s$1, s$1, s$1, s$1);
}
function Ee$1(o2, e, r) {
  return u$2(14, o2, me$1(e), s$1, s$1, d$1(e.message), r, s$1, s$1, s$1, s$1, s$1);
}
function Pe$1(o2, e, r) {
  return u$2(7, o2, s$1, e, s$1, s$1, s$1, s$1, r, s$1, s$1, s$1);
}
function M$1(o2, e) {
  return u$2(28, s$1, s$1, s$1, s$1, s$1, s$1, s$1, [o2, e], s$1, s$1, s$1);
}
function U$1(o2, e) {
  return u$2(30, s$1, s$1, s$1, s$1, s$1, s$1, s$1, [o2, e], s$1, s$1, s$1);
}
function L$1(o2, e, r) {
  return u$2(31, o2, s$1, s$1, s$1, s$1, s$1, s$1, r, e, s$1, s$1);
}
function Re$1(o2, e) {
  return u$2(32, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, e, s$1, s$1);
}
function Oe$1(o2, e) {
  return u$2(33, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, e, s$1, s$1);
}
function Ce$1(o2, e) {
  return u$2(34, o2, s$1, s$1, s$1, s$1, s$1, s$1, s$1, e, s$1, s$1);
}
var { toString: _e$1 } = Object.prototype;
function Er$1(o2, e) {
  return e instanceof Error ? `Seroval caught an error during the ${o2} process.
  
${e.name}
${e.message}

- For more information, please check the "cause" property of this error.
- If you believe this is an error in Seroval, please submit an issue at https://github.com/lxsmnsyc/seroval/issues/new` : `Seroval caught an error during the ${o2} process.

"${_e$1.call(e)}"

For more information, please check the "cause" property of this error.`;
}
var ee$2 = class ee2 extends Error {
  constructor(r, t) {
    super(Er$1(r, t));
    this.cause = t;
  }
}, E$1 = class E2 extends ee$2 {
  constructor(e) {
    super("parsing", e);
  }
}, Te = class extends ee$2 {
  constructor(e) {
    super("serialization", e);
  }
}, g$1 = class g2 extends Error {
  constructor(r) {
    super(`The value ${_e$1.call(r)} of type "${typeof r}" cannot be parsed/serialized.
      
There are few workarounds for this problem:
- Transform the value in a way that it can be serialized.
- If the reference is present on multiple runtimes (isomorphic), you can use the Reference API to map the references.`);
    this.value = r;
  }
}, y$1 = class y2 extends Error {
  constructor(e) {
    super('Unsupported node type "' + e.t + '".');
  }
}, W$1 = class W2 extends Error {
  constructor(e) {
    super('Missing plugin for tag "' + e + '".');
  }
}, ie$1 = class ie2 extends Error {
  constructor(r) {
    super('Missing reference for the value "' + _e$1.call(r) + '" of type "' + typeof r + '"');
    this.value = r;
  }
};
var T$1 = class T {
  constructor(e, r) {
    this.value = e;
    this.replacement = r;
  }
};
function z$1(o2, e, r) {
  return o2 & 2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>" + (r.startsWith("{") ? "(" + r + ")" : r) : "function(" + e.join(",") + "){return " + r + "}";
}
function S(o2, e, r) {
  return o2 & 2 ? (e.length === 1 ? e[0] : "(" + e.join(",") + ")") + "=>{" + r + "}" : "function(" + e.join(",") + "){" + r + "}";
}
var ar$1 = {}, ir$1 = {};
var lr$1 = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} };
function Pr(o2) {
  return z$1(o2, ["r"], "(r.p=new Promise(" + S(o2, ["s", "f"], "r.s=s,r.f=f") + "))");
}
function Rr(o2) {
  return S(o2, ["r", "d"], "r.s(d),r.p.s=1,r.p.v=d");
}
function Or(o2) {
  return S(o2, ["r", "d"], "r.f(d),r.p.s=2,r.p.v=d");
}
function Cr(o2) {
  return z$1(o2, ["b", "a", "s", "l", "p", "f", "e", "n"], "(b=[],a=!0,s=!1,l=[],p=0,f=" + S(o2, ["v", "m", "x"], "for(x=0;x<p;x++)l[x]&&l[x][m](v)") + ",n=" + S(o2, ["o", "x", "z", "c"], 'for(x=0,z=b.length;x<z;x++)(c=b[x],(!a&&x===z-1)?o[s?"return":"throw"](c):o.next(c))') + ",e=" + z$1(o2, ["o", "t"], "(a&&(l[t=p++]=o),n(o)," + S(o2, [], "a&&(l[t]=void 0)") + ")") + ",{__SEROVAL_STREAM__:!0,on:" + z$1(o2, ["o"], "e(o)") + ",next:" + S(o2, ["v"], 'a&&(b.push(v),f(v,"next"))') + ",throw:" + S(o2, ["v"], 'a&&(b.push(v),f(v,"throw"),a=s=!1,l.length=0)') + ",return:" + S(o2, ["v"], 'a&&(b.push(v),f(v,"return"),a=!1,s=!0,l.length=0)') + "})");
}
function cr(o2, e) {
  switch (e) {
    case 0:
      return "[]";
    case 1:
      return Pr(o2);
    case 2:
      return Rr(o2);
    case 3:
      return Or(o2);
    case 4:
      return Cr(o2);
    default:
      return "";
  }
}
function Fe$1(o2) {
  return "__SEROVAL_STREAM__" in o2;
}
function K$1() {
  let o2 = /* @__PURE__ */ new Set(), e = [], r = true, t = true;
  function n(l2) {
    for (let c2 of o2.keys()) c2.next(l2);
  }
  function a(l2) {
    for (let c2 of o2.keys()) c2.throw(l2);
  }
  function i2(l2) {
    for (let c2 of o2.keys()) c2.return(l2);
  }
  return { __SEROVAL_STREAM__: true, on(l2) {
    r && o2.add(l2);
    for (let c2 = 0, p2 = e.length; c2 < p2; c2++) {
      let h2 = e[c2];
      c2 === p2 - 1 && !r ? t ? l2.return(h2) : l2.throw(h2) : l2.next(h2);
    }
    return () => {
      r && o2.delete(l2);
    };
  }, next(l2) {
    r && (e.push(l2), n(l2));
  }, throw(l2) {
    r && (e.push(l2), a(l2), r = false, t = false, o2.clear());
  }, return(l2) {
    r && (e.push(l2), i2(l2), r = false, t = true, o2.clear());
  } };
}
function Ve$1(o2) {
  let e = K$1(), r = o2[Symbol.asyncIterator]();
  async function t() {
    try {
      let n = await r.next();
      n.done ? e.return(n.value) : (e.next(n.value), await t());
    } catch (n) {
      e.throw(n);
    }
  }
  return t().catch(() => {
  }), e;
}
function J$1(o2) {
  let e = [], r = -1, t = -1, n = o2[Symbol.iterator]();
  for (; ; ) try {
    let a = n.next();
    if (e.push(a.value), a.done) {
      t = e.length - 1;
      break;
    }
  } catch (a) {
    r = e.length, e.push(a);
  }
  return { v: e, t: r, d: t };
}
var Y$1 = class Y2 {
  constructor(e) {
    this.marked = /* @__PURE__ */ new Set();
    this.plugins = e.plugins, this.features = 31 ^ (e.disabledFeatures || 0), this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  createIndex(e) {
    let r = this.refs.size;
    return this.refs.set(e, r), r;
  }
  getIndexedValue(e) {
    let r = this.refs.get(e);
    return r != null ? (this.markRef(r), { type: 1, value: sr$1(r) }) : { type: 0, value: this.createIndex(e) };
  }
  getReference(e) {
    let r = this.getIndexedValue(e);
    return r.type === 1 ? r : je$1(e) ? { type: 2, value: nr$1(r.value, e) } : r;
  }
  parseWellKnownSymbol(e) {
    let r = this.getReference(e);
    return r.type !== 0 ? r.value : (f$1(e in ce$1, new g$1(e)), or$1(r.value, e));
  }
  parseSpecialReference(e) {
    let r = this.getIndexedValue(lr$1[e]);
    return r.type === 1 ? r.value : u$2(26, r.value, e, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1, s$1);
  }
  parseIteratorFactory() {
    let e = this.getIndexedValue(ar$1);
    return e.type === 1 ? e.value : u$2(27, e.value, s$1, s$1, s$1, s$1, s$1, s$1, s$1, this.parseWellKnownSymbol(Symbol.iterator), s$1, s$1);
  }
  parseAsyncIteratorFactory() {
    let e = this.getIndexedValue(ir$1);
    return e.type === 1 ? e.value : u$2(29, e.value, s$1, s$1, s$1, s$1, s$1, s$1, [this.parseSpecialReference(1), this.parseWellKnownSymbol(Symbol.asyncIterator)], s$1, s$1, s$1);
  }
  createObjectNode(e, r, t, n) {
    return u$2(t ? 11 : 10, e, s$1, s$1, s$1, s$1, n, s$1, s$1, s$1, s$1, fe$1(r));
  }
  createMapNode(e, r, t, n) {
    return u$2(8, e, s$1, s$1, s$1, s$1, s$1, { k: r, v: t, s: n }, s$1, this.parseSpecialReference(0), s$1, s$1);
  }
  createPromiseConstructorNode(e, r) {
    return u$2(22, e, r, s$1, s$1, s$1, s$1, s$1, s$1, this.parseSpecialReference(1), s$1, s$1);
  }
};
var kr = /^[$A-Z_][0-9A-Z_$]*$/i;
function Le(o2) {
  let e = o2[0];
  return (e === "$" || e === "_" || e >= "A" && e <= "Z" || e >= "a" && e <= "z") && kr.test(o2);
}
function se(o2) {
  switch (o2.t) {
    case 0:
      return o2.s + "=" + o2.v;
    case 2:
      return o2.s + ".set(" + o2.k + "," + o2.v + ")";
    case 1:
      return o2.s + ".add(" + o2.v + ")";
    case 3:
      return o2.s + ".delete(" + o2.k + ")";
  }
}
function Fr(o2) {
  let e = [], r = o2[0];
  for (let t = 1, n = o2.length, a, i2 = r; t < n; t++) a = o2[t], a.t === 0 && a.v === i2.v ? r = { t: 0, s: a.s, k: s$1, v: se(r) } : a.t === 2 && a.s === i2.s ? r = { t: 2, s: se(r), k: a.k, v: a.v } : a.t === 1 && a.s === i2.s ? r = { t: 1, s: se(r), k: s$1, v: a.v } : a.t === 3 && a.s === i2.s ? r = { t: 3, s: se(r), k: a.k, v: s$1 } : (e.push(r), r = a), i2 = a;
  return e.push(r), e;
}
function fr(o2) {
  if (o2.length) {
    let e = "", r = Fr(o2);
    for (let t = 0, n = r.length; t < n; t++) e += se(r[t]) + ",";
    return e;
  }
  return s$1;
}
var Vr = "Object.create(null)", Dr = "new Set", Br = "new Map", jr = "Promise.resolve", _r = "Promise.reject", Mr = { 3: "Object.freeze", 2: "Object.seal", 1: "Object.preventExtensions", 0: s$1 }, V2 = class {
  constructor(e) {
    this.stack = [];
    this.flags = [];
    this.assignments = [];
    this.plugins = e.plugins, this.features = e.features, this.marked = new Set(e.markedRefs);
  }
  createFunction(e, r) {
    return z$1(this.features, e, r);
  }
  createEffectfulFunction(e, r) {
    return S(this.features, e, r);
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  pushObjectFlag(e, r) {
    e !== 0 && (this.markRef(r), this.flags.push({ type: e, value: this.getRefParam(r) }));
  }
  resolveFlags() {
    let e = "";
    for (let r = 0, t = this.flags, n = t.length; r < n; r++) {
      let a = t[r];
      e += Mr[a.type] + "(" + a.value + "),";
    }
    return e;
  }
  resolvePatches() {
    let e = fr(this.assignments), r = this.resolveFlags();
    return e ? r ? e + r : e : r;
  }
  createAssignment(e, r) {
    this.assignments.push({ t: 0, s: e, k: s$1, v: r });
  }
  createAddAssignment(e, r) {
    this.assignments.push({ t: 1, s: this.getRefParam(e), k: s$1, v: r });
  }
  createSetAssignment(e, r, t) {
    this.assignments.push({ t: 2, s: this.getRefParam(e), k: r, v: t });
  }
  createDeleteAssignment(e, r) {
    this.assignments.push({ t: 3, s: this.getRefParam(e), k: r, v: s$1 });
  }
  createArrayAssign(e, r, t) {
    this.createAssignment(this.getRefParam(e) + "[" + r + "]", t);
  }
  createObjectAssign(e, r, t) {
    this.createAssignment(this.getRefParam(e) + "." + r, t);
  }
  isIndexedValueInStack(e) {
    return e.t === 4 && this.stack.includes(e.i);
  }
  serializeReference(e) {
    return this.assignIndexedValue(e.i, O$1 + '.get("' + e.s + '")');
  }
  serializeArrayItem(e, r, t) {
    return r ? this.isIndexedValueInStack(r) ? (this.markRef(e), this.createArrayAssign(e, t, this.getRefParam(r.i)), "") : this.serialize(r) : "";
  }
  serializeArray(e) {
    let r = e.i;
    if (e.l) {
      this.stack.push(r);
      let t = e.a, n = this.serializeArrayItem(r, t[0], 0), a = n === "";
      for (let i2 = 1, l2 = e.l, c2; i2 < l2; i2++) c2 = this.serializeArrayItem(r, t[i2], i2), n += "," + c2, a = c2 === "";
      return this.stack.pop(), this.pushObjectFlag(e.o, e.i), this.assignIndexedValue(r, "[" + n + (a ? ",]" : "]"));
    }
    return this.assignIndexedValue(r, "[]");
  }
  serializeProperty(e, r, t) {
    if (typeof r == "string") {
      let n = Number(r), a = n >= 0 && n.toString() === r || Le(r);
      if (this.isIndexedValueInStack(t)) {
        let i2 = this.getRefParam(t.i);
        return this.markRef(e.i), a && n !== n ? this.createObjectAssign(e.i, r, i2) : this.createArrayAssign(e.i, a ? r : '"' + r + '"', i2), "";
      }
      return (a ? r : '"' + r + '"') + ":" + this.serialize(t);
    }
    return "[" + this.serialize(r) + "]:" + this.serialize(t);
  }
  serializeProperties(e, r) {
    let t = r.s;
    if (t) {
      let n = r.k, a = r.v;
      this.stack.push(e.i);
      let i2 = this.serializeProperty(e, n[0], a[0]);
      for (let l2 = 1, c2 = i2; l2 < t; l2++) c2 = this.serializeProperty(e, n[l2], a[l2]), i2 += (c2 && i2 && ",") + c2;
      return this.stack.pop(), "{" + i2 + "}";
    }
    return "{}";
  }
  serializeObject(e) {
    return this.pushObjectFlag(e.o, e.i), this.assignIndexedValue(e.i, this.serializeProperties(e, e.p));
  }
  serializeWithObjectAssign(e, r, t) {
    let n = this.serializeProperties(e, r);
    return n !== "{}" ? "Object.assign(" + t + "," + n + ")" : t;
  }
  serializeStringKeyAssignment(e, r, t, n) {
    let a = this.serialize(n), i2 = Number(t), l2 = i2 >= 0 && i2.toString() === t || Le(t);
    if (this.isIndexedValueInStack(n)) l2 && i2 !== i2 ? this.createObjectAssign(e.i, t, a) : this.createArrayAssign(e.i, l2 ? t : '"' + t + '"', a);
    else {
      let c2 = this.assignments;
      this.assignments = r, l2 && i2 !== i2 ? this.createObjectAssign(e.i, t, a) : this.createArrayAssign(e.i, l2 ? t : '"' + t + '"', a), this.assignments = c2;
    }
  }
  serializeAssignment(e, r, t, n) {
    if (typeof t == "string") this.serializeStringKeyAssignment(e, r, t, n);
    else {
      let a = this.stack;
      this.stack = [];
      let i2 = this.serialize(n);
      this.stack = a;
      let l2 = this.assignments;
      this.assignments = r, this.createArrayAssign(e.i, this.serialize(t), i2), this.assignments = l2;
    }
  }
  serializeAssignments(e, r) {
    let t = r.s;
    if (t) {
      let n = [], a = r.k, i2 = r.v;
      this.stack.push(e.i);
      for (let l2 = 0; l2 < t; l2++) this.serializeAssignment(e, n, a[l2], i2[l2]);
      return this.stack.pop(), fr(n);
    }
    return s$1;
  }
  serializeDictionary(e, r) {
    if (e.p) if (this.features & 8) r = this.serializeWithObjectAssign(e, e.p, r);
    else {
      this.markRef(e.i);
      let t = this.serializeAssignments(e, e.p);
      if (t) return "(" + this.assignIndexedValue(e.i, r) + "," + t + this.getRefParam(e.i) + ")";
    }
    return this.assignIndexedValue(e.i, r);
  }
  serializeNullConstructor(e) {
    return this.pushObjectFlag(e.o, e.i), this.serializeDictionary(e, Vr);
  }
  serializeDate(e) {
    return this.assignIndexedValue(e.i, 'new Date("' + e.s + '")');
  }
  serializeRegExp(e) {
    return this.assignIndexedValue(e.i, "/" + e.c + "/" + e.m);
  }
  serializeSetItem(e, r) {
    return this.isIndexedValueInStack(r) ? (this.markRef(e), this.createAddAssignment(e, this.getRefParam(r.i)), "") : this.serialize(r);
  }
  serializeSet(e) {
    let r = Dr, t = e.l, n = e.i;
    if (t) {
      let a = e.a;
      this.stack.push(n);
      let i2 = this.serializeSetItem(n, a[0]);
      for (let l2 = 1, c2 = i2; l2 < t; l2++) c2 = this.serializeSetItem(n, a[l2]), i2 += (c2 && i2 && ",") + c2;
      this.stack.pop(), i2 && (r += "([" + i2 + "])");
    }
    return this.assignIndexedValue(n, r);
  }
  serializeMapEntry(e, r, t, n) {
    if (this.isIndexedValueInStack(r)) {
      let a = this.getRefParam(r.i);
      if (this.markRef(e), this.isIndexedValueInStack(t)) {
        let l2 = this.getRefParam(t.i);
        return this.createSetAssignment(e, a, l2), "";
      }
      if (t.t !== 4 && t.i != null && this.isMarked(t.i)) {
        let l2 = "(" + this.serialize(t) + ",[" + n + "," + n + "])";
        return this.createSetAssignment(e, a, this.getRefParam(t.i)), this.createDeleteAssignment(e, n), l2;
      }
      let i2 = this.stack;
      return this.stack = [], this.createSetAssignment(e, a, this.serialize(t)), this.stack = i2, "";
    }
    if (this.isIndexedValueInStack(t)) {
      let a = this.getRefParam(t.i);
      if (this.markRef(e), r.t !== 4 && r.i != null && this.isMarked(r.i)) {
        let l2 = "(" + this.serialize(r) + ",[" + n + "," + n + "])";
        return this.createSetAssignment(e, this.getRefParam(r.i), a), this.createDeleteAssignment(e, n), l2;
      }
      let i2 = this.stack;
      return this.stack = [], this.createSetAssignment(e, this.serialize(r), a), this.stack = i2, "";
    }
    return "[" + this.serialize(r) + "," + this.serialize(t) + "]";
  }
  serializeMap(e) {
    let r = Br, t = e.e.s, n = e.i, a = e.f, i2 = this.getRefParam(a.i);
    if (t) {
      let l2 = e.e.k, c2 = e.e.v;
      this.stack.push(n);
      let p2 = this.serializeMapEntry(n, l2[0], c2[0], i2);
      for (let h2 = 1, X2 = p2; h2 < t; h2++) X2 = this.serializeMapEntry(n, l2[h2], c2[h2], i2), p2 += (X2 && p2 && ",") + X2;
      this.stack.pop(), p2 && (r += "([" + p2 + "])");
    }
    return a.t === 26 && (this.markRef(a.i), r = "(" + this.serialize(a) + "," + r + ")"), this.assignIndexedValue(n, r);
  }
  serializeArrayBuffer(e) {
    let r = "new Uint8Array(", t = e.s, n = t.length;
    if (n) {
      r += "[" + t[0];
      for (let a = 1; a < n; a++) r += "," + t[a];
      r += "]";
    }
    return this.assignIndexedValue(e.i, r + ").buffer");
  }
  serializeTypedArray(e) {
    return this.assignIndexedValue(e.i, "new " + e.c + "(" + this.serialize(e.f) + "," + e.b + "," + e.l + ")");
  }
  serializeDataView(e) {
    return this.assignIndexedValue(e.i, "new DataView(" + this.serialize(e.f) + "," + e.b + "," + e.l + ")");
  }
  serializeAggregateError(e) {
    let r = e.i;
    this.stack.push(r);
    let t = this.serializeDictionary(e, 'new AggregateError([],"' + e.m + '")');
    return this.stack.pop(), t;
  }
  serializeError(e) {
    return this.serializeDictionary(e, "new " + ue$1[e.s] + '("' + e.m + '")');
  }
  serializePromise(e) {
    let r, t = e.f, n = e.i, a = e.s ? jr : _r;
    if (this.isIndexedValueInStack(t)) {
      let i2 = this.getRefParam(t.i);
      r = a + (e.s ? "().then(" + this.createFunction([], i2) + ")" : "().catch(" + this.createEffectfulFunction([], "throw " + i2) + ")");
    } else {
      this.stack.push(n);
      let i2 = this.serialize(t);
      this.stack.pop(), r = a + "(" + i2 + ")";
    }
    return this.assignIndexedValue(n, r);
  }
  serializeWellKnownSymbol(e) {
    return this.assignIndexedValue(e.i, $e[e.s]);
  }
  serializeBoxed(e) {
    return this.assignIndexedValue(e.i, "Object(" + this.serialize(e.f) + ")");
  }
  serializePlugin(e) {
    let r = this.plugins;
    if (r) for (let t = 0, n = r.length; t < n; t++) {
      let a = r[t];
      if (a.tag === e.c) return this.assignIndexedValue(e.i, a.serialize(e.s, this, { id: e.i }));
    }
    throw new W$1(e.c);
  }
  getConstructor(e) {
    let r = this.serialize(e);
    return r === this.getRefParam(e.i) ? r : "(" + r + ")";
  }
  serializePromiseConstructor(e) {
    let r = this.assignIndexedValue(e.s, "{p:0,s:0,f:0}");
    return this.assignIndexedValue(e.i, this.getConstructor(e.f) + "(" + r + ")");
  }
  serializePromiseResolve(e) {
    return this.getConstructor(e.a[0]) + "(" + this.getRefParam(e.i) + "," + this.serialize(e.a[1]) + ")";
  }
  serializePromiseReject(e) {
    return this.getConstructor(e.a[0]) + "(" + this.getRefParam(e.i) + "," + this.serialize(e.a[1]) + ")";
  }
  serializeSpecialReference(e) {
    return this.assignIndexedValue(e.i, cr(this.features, e.s));
  }
  serializeIteratorFactory(e) {
    let r = "", t = false;
    return e.f.t !== 4 && (this.markRef(e.f.i), r = "(" + this.serialize(e.f) + ",", t = true), r += this.assignIndexedValue(e.i, this.createFunction(["s"], this.createFunction(["i", "c", "d", "t"], "(i=0,t={[" + this.getRefParam(e.f.i) + "]:" + this.createFunction([], "t") + ",next:" + this.createEffectfulFunction([], "if(i>s.d)return{done:!0,value:void 0};if(d=s.v[c=i++],c===s.t)throw d;return{done:c===s.d,value:d}") + "})"))), t && (r += ")"), r;
  }
  serializeIteratorFactoryInstance(e) {
    return this.getConstructor(e.a[0]) + "(" + this.serialize(e.a[1]) + ")";
  }
  serializeAsyncIteratorFactory(e) {
    let r = e.a[0], t = e.a[1], n = "";
    r.t !== 4 && (this.markRef(r.i), n += "(" + this.serialize(r)), t.t !== 4 && (this.markRef(t.i), n += (n ? "," : "(") + this.serialize(t)), n && (n += ",");
    let a = this.assignIndexedValue(e.i, this.createFunction(["s"], this.createFunction(["b", "c", "p", "d", "e", "t", "f"], "(b=[],c=0,p=[],d=-1,e=!1,f=" + this.createEffectfulFunction(["i", "l"], "for(i=0,l=p.length;i<l;i++)p[i].s({done:!0,value:void 0})") + ",s.on({next:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!1,value:v});b.push(v)") + ",throw:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.f(v);f(),d=b.length,e=!0,b.push(v)") + ",return:" + this.createEffectfulFunction(["v", "t"], "if(t=p.shift())t.s({done:!0,value:v});f(),d=b.length,b.push(v)") + "}),t={[" + this.getRefParam(t.i) + "]:" + this.createFunction([], "t.p") + ",next:" + this.createEffectfulFunction(["i", "t", "v"], "if(d===-1){return((i=c++)>=b.length)?(" + this.getRefParam(r.i) + "(t={p:0,s:0,f:0}),p.push(t),t.p):{done:!1,value:b[i]}}if(c>d)return{done:!0,value:void 0};if(v=b[i=c++],i!==d)return{done:!1,value:v};if(e)throw v;return{done:!0,value:v}") + "})")));
    return n ? n + a + ")" : a;
  }
  serializeAsyncIteratorFactoryInstance(e) {
    return this.getConstructor(e.a[0]) + "(" + this.serialize(e.a[1]) + ")";
  }
  serializeStreamConstructor(e) {
    let r = this.assignIndexedValue(e.i, this.getConstructor(e.f) + "()"), t = e.a.length;
    if (t) {
      let n = this.serialize(e.a[0]);
      for (let a = 1; a < t; a++) n += "," + this.serialize(e.a[a]);
      return "(" + r + "," + n + "," + this.getRefParam(e.i) + ")";
    }
    return r;
  }
  serializeStreamNext(e) {
    return this.getRefParam(e.i) + ".next(" + this.serialize(e.f) + ")";
  }
  serializeStreamThrow(e) {
    return this.getRefParam(e.i) + ".throw(" + this.serialize(e.f) + ")";
  }
  serializeStreamReturn(e) {
    return this.getRefParam(e.i) + ".return(" + this.serialize(e.f) + ")";
  }
  serialize(e) {
    try {
      switch (e.t) {
        case 2:
          return qe[e.s];
        case 0:
          return "" + e.s;
        case 1:
          return '"' + e.s + '"';
        case 3:
          return e.s + "n";
        case 4:
          return this.getRefParam(e.i);
        case 18:
          return this.serializeReference(e);
        case 9:
          return this.serializeArray(e);
        case 10:
          return this.serializeObject(e);
        case 11:
          return this.serializeNullConstructor(e);
        case 5:
          return this.serializeDate(e);
        case 6:
          return this.serializeRegExp(e);
        case 7:
          return this.serializeSet(e);
        case 8:
          return this.serializeMap(e);
        case 19:
          return this.serializeArrayBuffer(e);
        case 16:
        case 15:
          return this.serializeTypedArray(e);
        case 20:
          return this.serializeDataView(e);
        case 14:
          return this.serializeAggregateError(e);
        case 13:
          return this.serializeError(e);
        case 12:
          return this.serializePromise(e);
        case 17:
          return this.serializeWellKnownSymbol(e);
        case 21:
          return this.serializeBoxed(e);
        case 22:
          return this.serializePromiseConstructor(e);
        case 23:
          return this.serializePromiseResolve(e);
        case 24:
          return this.serializePromiseReject(e);
        case 25:
          return this.serializePlugin(e);
        case 26:
          return this.serializeSpecialReference(e);
        case 27:
          return this.serializeIteratorFactory(e);
        case 28:
          return this.serializeIteratorFactoryInstance(e);
        case 29:
          return this.serializeAsyncIteratorFactory(e);
        case 30:
          return this.serializeAsyncIteratorFactoryInstance(e);
        case 31:
          return this.serializeStreamConstructor(e);
        case 32:
          return this.serializeStreamNext(e);
        case 33:
          return this.serializeStreamThrow(e);
        case 34:
          return this.serializeStreamReturn(e);
        default:
          throw new y$1(e);
      }
    } catch (r) {
      throw new Te(r);
    }
  }
};
var D2 = class extends V2 {
  constructor(r) {
    super(r);
    this.mode = "cross";
    this.scopeId = r.scopeId;
  }
  getRefParam(r) {
    return Q + "[" + r + "]";
  }
  assignIndexedValue(r, t) {
    return this.getRefParam(r) + "=" + t;
  }
  serializeTop(r) {
    let t = this.serialize(r), n = r.i;
    if (n == null) return t;
    let a = this.resolvePatches(), i2 = this.getRefParam(n), l2 = this.scopeId == null ? "" : Q, c2 = a ? "(" + t + "," + a + i2 + ")" : t;
    if (l2 === "") return r.t === 10 && !a ? "(" + c2 + ")" : c2;
    let p2 = this.scopeId == null ? "()" : "(" + Q + '["' + d$1(this.scopeId) + '"])';
    return "(" + this.createFunction([l2], c2) + ")" + p2;
  }
};
var v$1 = class v2 extends Y$1 {
  parseItems(e) {
    let r = [];
    for (let t = 0, n = e.length; t < n; t++) t in e && (r[t] = this.parse(e[t]));
    return r;
  }
  parseArray(e, r) {
    return Ne$1(e, r, this.parseItems(r));
  }
  parseProperties(e) {
    let r = Object.entries(e), t = [], n = [];
    for (let i2 = 0, l2 = r.length; i2 < l2; i2++) t.push(d$1(r[i2][0])), n.push(this.parse(r[i2][1]));
    let a = Symbol.iterator;
    return a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(M$1(this.parseIteratorFactory(), this.parse(J$1(e))))), a = Symbol.asyncIterator, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(U$1(this.parseAsyncIteratorFactory(), this.parse(K$1())))), a = Symbol.toStringTag, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(w$1(e[a]))), a = Symbol.isConcatSpreadable, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(e[a] ? I$1 : A$1)), { k: t, v: n, s: t.length };
  }
  parsePlainObject(e, r, t) {
    return this.createObjectNode(e, r, t, this.parseProperties(r));
  }
  parseBoxed(e, r) {
    return be$1(e, this.parse(r.valueOf()));
  }
  parseTypedArray(e, r) {
    return xe$1(e, r, this.parse(r.buffer));
  }
  parseBigIntTypedArray(e, r) {
    return Ie$1(e, r, this.parse(r.buffer));
  }
  parseDataView(e, r) {
    return Ae$1(e, r, this.parse(r.buffer));
  }
  parseError(e, r) {
    let t = j$1(r, this.features);
    return we$1(e, r, t ? this.parseProperties(t) : s$1);
  }
  parseAggregateError(e, r) {
    let t = j$1(r, this.features);
    return Ee$1(e, r, t ? this.parseProperties(t) : s$1);
  }
  parseMap(e, r) {
    let t = [], n = [];
    for (let [a, i2] of r.entries()) t.push(this.parse(a)), n.push(this.parse(i2));
    return this.createMapNode(e, t, n, r.size);
  }
  parseSet(e, r) {
    let t = [];
    for (let n of r.keys()) t.push(this.parse(n));
    return Pe$1(e, r.size, t);
  }
  parsePlugin(e, r) {
    let t = this.plugins;
    if (t) for (let n = 0, a = t.length; n < a; n++) {
      let i2 = t[n];
      if (i2.parse.sync && i2.test(r)) return _$1(e, i2.tag, i2.parse.sync(r, this, { id: e }));
    }
  }
  parseStream(e, r) {
    return L$1(e, this.parseSpecialReference(4), []);
  }
  parsePromise(e, r) {
    return this.createPromiseConstructorNode(e, this.createIndex({}));
  }
  parseObject(e, r) {
    if (Array.isArray(r)) return this.parseArray(e, r);
    if (Fe$1(r)) return this.parseStream(e, r);
    let t = r.constructor;
    if (t === T$1) return this.parse(r.replacement);
    let n = this.parsePlugin(e, r);
    if (n) return n;
    switch (t) {
      case Object:
        return this.parsePlainObject(e, r, false);
      case void 0:
        return this.parsePlainObject(e, r, true);
      case Date:
        return he$1(e, r);
      case RegExp:
        return ye$1(e, r);
      case Error:
      case EvalError:
      case RangeError:
      case ReferenceError:
      case SyntaxError:
      case TypeError:
      case URIError:
        return this.parseError(e, r);
      case Number:
      case Boolean:
      case String:
      case BigInt:
        return this.parseBoxed(e, r);
      case ArrayBuffer:
        return ve$1(e, r);
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Uint8ClampedArray:
      case Float32Array:
      case Float64Array:
        return this.parseTypedArray(e, r);
      case DataView:
        return this.parseDataView(e, r);
      case Map:
        return this.parseMap(e, r);
      case Set:
        return this.parseSet(e, r);
    }
    if (t === Promise || r instanceof Promise) return this.parsePromise(e, r);
    let a = this.features;
    if (a & 16) switch (t) {
      case BigInt64Array:
      case BigUint64Array:
        return this.parseBigIntTypedArray(e, r);
    }
    if (a & 1 && typeof AggregateError != "undefined" && (t === AggregateError || r instanceof AggregateError)) return this.parseAggregateError(e, r);
    if (r instanceof Error) return this.parseError(e, r);
    if (Symbol.iterator in r || Symbol.asyncIterator in r) return this.parsePlainObject(e, r, !!t);
    throw new g$1(r);
  }
  parseFunction(e) {
    let r = this.getReference(e);
    if (r.type !== 0) return r.value;
    let t = this.parsePlugin(r.value, e);
    if (t) return t;
    throw new g$1(e);
  }
  parse(e) {
    switch (typeof e) {
      case "boolean":
        return e ? I$1 : A$1;
      case "undefined":
        return pe$1;
      case "string":
        return w$1(e);
      case "number":
        return ge$1(e);
      case "bigint":
        return Se$1(e);
      case "object": {
        if (e) {
          let r = this.getReference(e);
          return r.type === 0 ? this.parseObject(r.value, e) : r.value;
        }
        return de$1;
      }
      case "symbol":
        return this.parseWellKnownSymbol(e);
      case "function":
        return this.parseFunction(e);
      default:
        throw new g$1(e);
    }
  }
  parseTop(e) {
    try {
      return this.parse(e);
    } catch (r) {
      throw r instanceof E$1 ? r : new E$1(r);
    }
  }
};
var oe$1 = class oe2 extends v$1 {
  constructor(r) {
    super(r);
    this.alive = true;
    this.pending = 0;
    this.initial = true;
    this.buffer = [];
    this.onParseCallback = r.onParse, this.onErrorCallback = r.onError, this.onDoneCallback = r.onDone;
  }
  onParseInternal(r, t) {
    try {
      this.onParseCallback(r, t);
    } catch (n) {
      this.onError(n);
    }
  }
  flush() {
    for (let r = 0, t = this.buffer.length; r < t; r++) this.onParseInternal(this.buffer[r], false);
  }
  onParse(r) {
    this.initial ? this.buffer.push(r) : this.onParseInternal(r, false);
  }
  onError(r) {
    if (this.onErrorCallback) this.onErrorCallback(r);
    else throw r;
  }
  onDone() {
    this.onDoneCallback && this.onDoneCallback();
  }
  pushPendingState() {
    this.pending++;
  }
  popPendingState() {
    --this.pending <= 0 && this.onDone();
  }
  parseProperties(r) {
    let t = Object.entries(r), n = [], a = [];
    for (let l2 = 0, c2 = t.length; l2 < c2; l2++) n.push(d$1(t[l2][0])), a.push(this.parse(t[l2][1]));
    let i2 = Symbol.iterator;
    return i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(M$1(this.parseIteratorFactory(), this.parse(J$1(r))))), i2 = Symbol.asyncIterator, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(U$1(this.parseAsyncIteratorFactory(), this.parse(Ve$1(r))))), i2 = Symbol.toStringTag, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(w$1(r[i2]))), i2 = Symbol.isConcatSpreadable, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(r[i2] ? I$1 : A$1)), { k: n, v: a, s: n.length };
  }
  handlePromiseSuccess(r, t) {
    let n = this.parseWithError(t);
    n && this.onParse(u$2(23, r, s$1, s$1, s$1, s$1, s$1, s$1, [this.parseSpecialReference(2), n], s$1, s$1, s$1)), this.popPendingState();
  }
  handlePromiseFailure(r, t) {
    if (this.alive) {
      let n = this.parseWithError(t);
      n && this.onParse(u$2(24, r, s$1, s$1, s$1, s$1, s$1, s$1, [this.parseSpecialReference(3), n], s$1, s$1, s$1));
    }
    this.popPendingState();
  }
  parsePromise(r, t) {
    let n = this.createIndex({});
    return t.then(this.handlePromiseSuccess.bind(this, n), this.handlePromiseFailure.bind(this, n)), this.pushPendingState(), this.createPromiseConstructorNode(r, n);
  }
  parsePlugin(r, t) {
    let n = this.plugins;
    if (n) for (let a = 0, i2 = n.length; a < i2; a++) {
      let l2 = n[a];
      if (l2.parse.stream && l2.test(t)) return _$1(r, l2.tag, l2.parse.stream(t, this, { id: r }));
    }
    return s$1;
  }
  parseStream(r, t) {
    let n = L$1(r, this.parseSpecialReference(4), []);
    return this.pushPendingState(), t.on({ next: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Re$1(r, i2));
      }
    }, throw: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Oe$1(r, i2));
      }
      this.popPendingState();
    }, return: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Ce$1(r, i2));
      }
      this.popPendingState();
    } }), n;
  }
  parseWithError(r) {
    try {
      return this.parse(r);
    } catch (t) {
      return this.onError(t), s$1;
    }
  }
  start(r) {
    let t = this.parseWithError(r);
    t && (this.onParseInternal(t, true), this.initial = false, this.flush(), this.pending <= 0 && this.destroy());
  }
  destroy() {
    this.alive && (this.onDone(), this.alive = false);
  }
  isAlive() {
    return this.alive;
  }
};
var G$1 = class G2 extends oe$1 {
  constructor() {
    super(...arguments);
    this.mode = "cross";
  }
};
function gr(o2, e) {
  let r = m$1(e.plugins), t = new G$1({ plugins: r, refs: e.refs, disabledFeatures: e.disabledFeatures, onParse(n, a) {
    let i2 = new D2({ plugins: r, features: t.features, scopeId: e.scopeId, markedRefs: t.marked }), l2;
    try {
      l2 = i2.serializeTop(n);
    } catch (c2) {
      e.onError && e.onError(c2);
      return;
    }
    e.onSerialize(l2, a);
  }, onError: e.onError, onDone: e.onDone });
  return t.start(o2), t.destroy.bind(t);
}
const GLOBAL_TSR = "$_TSR";
function createSerializationAdapter(opts) {
  return opts;
}
function makeSsrSerovalPlugin(serializationAdapter, options) {
  return Hr({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: {
      stream(value, ctx) {
        return ctx.parse(serializationAdapter.toSerializable(value));
      }
    },
    serialize(node, ctx) {
      options.didRun = true;
      return GLOBAL_TSR + '.t.get("' + serializationAdapter.key + '")(' + ctx.serialize(node) + ")";
    },
    // we never deserialize on the server during SSR
    deserialize: void 0
  });
}
function makeSerovalPlugin(serializationAdapter) {
  return Hr({
    tag: "$TSR/t/" + serializationAdapter.key,
    test: serializationAdapter.test,
    parse: {
      sync(value, ctx) {
        return ctx.parse(serializationAdapter.toSerializable(value));
      },
      async async(value, ctx) {
        return await ctx.parse(serializationAdapter.toSerializable(value));
      },
      stream(value, ctx) {
        return ctx.parse(serializationAdapter.toSerializable(value));
      }
    },
    // we don't generate JS code outside of SSR (for now)
    serialize: void 0,
    deserialize(node, ctx) {
      return serializationAdapter.fromSerializable(ctx.deserialize(node));
    }
  });
}
var p = {}, ee$1 = Hr({ tag: "seroval-plugins/web/ReadableStreamFactory", test(e) {
  return e === p;
}, parse: { sync() {
}, async async() {
  return await Promise.resolve(void 0);
}, stream() {
} }, serialize(e, r) {
  return r.createFunction(["d"], "new ReadableStream({start:" + r.createEffectfulFunction(["c"], "d.on({next:" + r.createEffectfulFunction(["v"], "try{c.enqueue(v)}catch{}") + ",throw:" + r.createEffectfulFunction(["v"], "c.error(v)") + ",return:" + r.createEffectfulFunction([], "try{c.close()}catch{}") + "})") + "})");
}, deserialize() {
  return p;
} });
function z(e) {
  let r = K$1(), a = e.getReader();
  async function t() {
    try {
      let n = await a.read();
      n.done ? r.return(n.value) : (r.next(n.value), await t());
    } catch (n) {
      r.throw(n);
    }
  }
  return t().catch(() => {
  }), r;
}
var re$1 = Hr({ tag: "seroval/plugins/web/ReadableStream", extends: [ee$1], test(e) {
  return typeof ReadableStream == "undefined" ? false : e instanceof ReadableStream;
}, parse: { sync(e, r) {
  return { factory: r.parse(p), stream: r.parse(K$1()) };
}, async async(e, r) {
  return { factory: await r.parse(p), stream: await r.parse(z(e)) };
}, stream(e, r) {
  return { factory: r.parse(p), stream: r.parse(z(e)) };
} }, serialize(e, r) {
  return "(" + r.serialize(e.factory) + ")(" + r.serialize(e.stream) + ")";
}, deserialize(e, r) {
  let a = r.deserialize(e.stream);
  return new ReadableStream({ start(t) {
    a.on({ next(n) {
      try {
        t.enqueue(n);
      } catch (b) {
      }
    }, throw(n) {
      t.error(n);
    }, return() {
      try {
        t.close();
      } catch (n) {
      }
    } });
  } });
} }), u$1 = re$1;
const ShallowErrorPlugin = /* @__PURE__ */ Hr({
  tag: "$TSR/Error",
  test(value) {
    return value instanceof Error;
  },
  parse: {
    sync(value, ctx) {
      return {
        message: ctx.parse(value.message)
      };
    },
    async async(value, ctx) {
      return {
        message: await ctx.parse(value.message)
      };
    },
    stream(value, ctx) {
      return {
        message: ctx.parse(value.message)
      };
    }
  },
  serialize(node, ctx) {
    return "new Error(" + ctx.serialize(node.message) + ")";
  },
  deserialize(node, ctx) {
    return new Error(ctx.deserialize(node.message));
  }
});
const defaultSerovalPlugins = [
  ShallowErrorPlugin,
  // ReadableStreamNode is not exported by seroval
  u$1
];
var _tmpl$$3 = ["<div", ' style="', '"><div style="', '"><strong style="', '">Something went wrong!</strong><button style="', '">', '</button></div><div style="', '"></div><!--$-->', "<!--/--></div>"], _tmpl$2$1 = ["<div", '><pre style="', '">', "</pre></div>"], _tmpl$3 = ["<code", ">", "</code>"];
function CatchBoundary(props) {
  return createComponent(ErrorBoundary, {
    fallback: (error, reset) => {
      props.onCatch?.(error);
      createEffect(on([props.getResetKey], () => reset(), {
        defer: true
      }));
      return createComponent(Dynamic, {
        get component() {
          return props.errorComponent ?? ErrorComponent;
        },
        error,
        reset
      });
    },
    get children() {
      return props.children;
    }
  });
}
function ErrorComponent({
  error
}) {
  const [show, setShow] = createSignal(false);
  return ssr(_tmpl$$3, ssrHydrationKey(), ssrStyleProperty("padding:", ".5rem") + ssrStyleProperty(";max-width:", "100%"), ssrStyleProperty("display:", "flex") + ssrStyleProperty(";align-items:", "center") + ssrStyleProperty(";gap:", ".5rem"), ssrStyleProperty("font-size:", "1rem"), ssrStyleProperty("appearance:", "none") + ssrStyleProperty(";font-size:", ".6em") + ssrStyleProperty(";border:", "1px solid currentColor") + ssrStyleProperty(";padding:", ".1rem .2rem") + ssrStyleProperty(";font-weight:", "bold") + ssrStyleProperty(";border-radius:", ".25rem"), show() ? "Hide Error" : "Show Error", ssrStyleProperty("height:", ".25rem"), show() ? ssr(_tmpl$2$1, ssrHydrationKey(), ssrStyleProperty("font-size:", ".7em") + ssrStyleProperty(";border:", "1px solid red") + ssrStyleProperty(";border-radius:", ".25rem") + ssrStyleProperty(";padding:", ".3rem") + ssrStyleProperty(";color:", "red") + ssrStyleProperty(";overflow:", "auto"), error.message ? ssr(_tmpl$3, ssrHydrationKey(), escape(error.message)) : escape(null)) : escape(null));
}
function warning(condition, message) {
}
function isWrappable(obj) {
  return obj != null && typeof obj === "object" && (Object.getPrototypeOf(obj) === Object.prototype || Array.isArray(obj));
}
function setProperty(state, property, value, force) {
  if (state[property] === value) return;
  if (value === void 0) {
    delete state[property];
  } else state[property] = value;
}
function mergeStoreNode(state, value, force) {
  const keys = Object.keys(value);
  for (let i2 = 0; i2 < keys.length; i2 += 1) {
    const key = keys[i2];
    setProperty(state, key, value[key]);
  }
}
function updateArray(current, next) {
  if (typeof next === "function") next = next(current);
  if (Array.isArray(next)) {
    if (current === next) return;
    let i2 = 0, len = next.length;
    for (; i2 < len; i2++) {
      const value = next[i2];
      if (current[i2] !== value) setProperty(current, i2, value);
    }
    setProperty(current, "length", len);
  } else mergeStoreNode(current, next);
}
function updatePath(current, path, traversed = []) {
  let part, next = current;
  if (path.length > 1) {
    part = path.shift();
    const partType = typeof part, isArray = Array.isArray(current);
    if (Array.isArray(part)) {
      for (let i2 = 0; i2 < part.length; i2++) {
        updatePath(current, [part[i2]].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "function") {
      for (let i2 = 0; i2 < current.length; i2++) {
        if (part(current[i2], i2)) updatePath(current, [i2].concat(path), traversed);
      }
      return;
    } else if (isArray && partType === "object") {
      const {
        from = 0,
        to = current.length - 1,
        by = 1
      } = part;
      for (let i2 = from; i2 <= to; i2 += by) {
        updatePath(current, [i2].concat(path), traversed);
      }
      return;
    } else if (path.length > 1) {
      updatePath(current[part], path, [part].concat(traversed));
      return;
    }
    next = current[part];
    traversed = [part].concat(traversed);
  }
  let value = path[0];
  if (typeof value === "function") {
    value = value(next, traversed);
    if (value === next) return;
  }
  if (part === void 0 && value == void 0) return;
  if (part === void 0 || isWrappable(next) && isWrappable(value) && !Array.isArray(value)) {
    mergeStoreNode(next, value);
  } else setProperty(current, part, value);
}
function createStore(state) {
  const isArray = Array.isArray(state);
  function setStore(...args) {
    isArray && args.length === 1 ? updateArray(state, args[0]) : updatePath(state, args);
  }
  return [state, setStore];
}
function reconcile(value, options = {}) {
  return (state) => {
    if (!isWrappable(state) || !isWrappable(value)) return value;
    const targetKeys = Object.keys(value);
    for (let i2 = 0, len = targetKeys.length; i2 < len; i2++) {
      const key = targetKeys[i2];
      setProperty(state, key, value[key]);
    }
    const previousKeys = Object.keys(state);
    for (let i2 = 0, len = previousKeys.length; i2 < len; i2++) {
      if (value[previousKeys[i2]] === void 0) setProperty(state, previousKeys[i2], void 0);
    }
    return state;
  };
}
function useStore(store, selector = (d2) => d2) {
  const [slice, setSlice] = createStore({
    value: selector(store.state)
  });
  const unsub = store.subscribe(() => {
    const newValue = selector(store.state);
    setSlice("value", reconcile(newValue));
  });
  onCleanup(() => {
    unsub();
  });
  return () => slice.value;
}
const routerContext = createContext(null);
function getRouterContext() {
  if (typeof document === "undefined") {
    return routerContext;
  }
  if (window.__TSR_ROUTER_CONTEXT__) {
    return window.__TSR_ROUTER_CONTEXT__;
  }
  window.__TSR_ROUTER_CONTEXT__ = routerContext;
  return routerContext;
}
function useRouter(opts) {
  const value = useContext(getRouterContext());
  warning(!((opts?.warn ?? true) && !value));
  return value;
}
function useRouterState(opts) {
  const contextRouter = useRouter({
    warn: opts?.router === void 0
  });
  const router = opts?.router || contextRouter;
  return useStore(router.__store, (state) => {
    if (opts?.select) return opts.select(state);
    return state;
  });
}
const usePrevious = (fn) => {
  return createMemo((prev = {
    current: null,
    previous: null
  }) => {
    const current = fn();
    if (prev.current !== current) {
      prev.previous = prev.current;
      prev.current = current;
    }
    return prev;
  });
};
function useIntersectionObserver(ref, callback, intersectionObserverOptions = {}, options = {}) {
  let observerRef = null;
  return () => observerRef;
}
const matchContext = createContext(() => void 0);
const dummyMatchContext = createContext(() => void 0);
function Transitioner() {
  const router = useRouter();
  let mountLoadForRouter = {
    router,
    mounted: false
  };
  const isLoading = useRouterState({
    select: ({
      isLoading: isLoading2
    }) => isLoading2
  });
  const [isTransitioning, setIsTransitioning] = createSignal(false);
  const hasPendingMatches = useRouterState({
    select: (s3) => s3.matches.some((d2) => d2.status === "pending")
  });
  const previousIsLoading = usePrevious(isLoading);
  const isAnyPending = () => isLoading() || isTransitioning() || hasPendingMatches();
  const previousIsAnyPending = usePrevious(isAnyPending);
  const isPagePending = () => isLoading() || hasPendingMatches();
  const previousIsPagePending = usePrevious(isPagePending);
  router.startTransition = async (fn) => {
    setIsTransitioning(true);
    await fn();
    setIsTransitioning(false);
  };
  createRenderEffect(() => {
    untrack(() => {
      if (mountLoadForRouter.router === router && mountLoadForRouter.mounted) {
        return;
      }
      mountLoadForRouter = {
        router,
        mounted: true
      };
      const tryLoad = async () => {
        try {
          await router.load();
        } catch (err) {
          console.error(err);
        }
      };
      tryLoad();
    });
  });
  createRenderEffect(on([previousIsLoading, isLoading], ([previousIsLoading2, isLoading2]) => {
    if (previousIsLoading2.previous && !isLoading2) {
      router.emit({
        type: "onLoad",
        ...getLocationChangeInfo(router.state)
      });
    }
  }));
  createRenderEffect(on([isPagePending, previousIsPagePending], ([isPagePending2, previousIsPagePending2]) => {
    if (previousIsPagePending2.previous && !isPagePending2) {
      router.emit({
        type: "onBeforeRouteMount",
        ...getLocationChangeInfo(router.state)
      });
    }
  }));
  createRenderEffect(on([isAnyPending, previousIsAnyPending], ([isAnyPending2, previousIsAnyPending2]) => {
    if (previousIsAnyPending2.previous && !isAnyPending2) {
      router.emit({
        type: "onResolved",
        ...getLocationChangeInfo(router.state)
      });
      router.__store.setState((s3) => ({
        ...s3,
        status: "idle",
        resolvedLocation: s3.location
      }));
      handleHashScroll(router);
    }
  }));
  return null;
}
var _tmpl$$2 = ["<p", ">Not Found</p>"];
function CatchNotFound(props) {
  const resetKey = useRouterState({
    select: (s3) => `not-found-${s3.location.pathname}-${s3.status}`
  });
  return createComponent(CatchBoundary, {
    getResetKey: () => resetKey(),
    onCatch: (error) => {
      if (isNotFound(error)) {
        props.onCatch?.(error);
      } else {
        throw error;
      }
    },
    errorComponent: ({
      error
    }) => {
      if (isNotFound(error)) {
        return props.fallback?.(error);
      } else {
        throw error;
      }
    },
    get children() {
      return props.children;
    }
  });
}
function DefaultGlobalNotFound() {
  return ssr(_tmpl$$2, ssrHydrationKey());
}
function SafeFragment(props) {
  return props.children;
}
function renderRouteNotFound(router, route, data) {
  if (!route.options.notFoundComponent) {
    if (router.options.defaultNotFoundComponent) {
      return createComponent(router.options.defaultNotFoundComponent, {
        data
      });
    }
    return createComponent(DefaultGlobalNotFound, {});
  }
  return createComponent(route.options.notFoundComponent, {
    data
  });
}
var _tmpl$$1 = ["<script", ' class="$tsr">', "<\/script>"];
function ScriptOnce({
  children: children2
}) {
  const router = useRouter();
  if (!router.isServer) {
    return null;
  }
  return ssr(_tmpl$$1, ssrHydrationKey() + ssrAttribute("nonce", escape(router.options.ssr?.nonce, true)), [children2].filter(Boolean).join("\n") + ";$_TSR.c()");
}
function ScrollRestoration() {
  const router = useRouter();
  if (!router.isScrollRestoring || !router.isServer) {
    return null;
  }
  if (typeof router.options.scrollRestoration === "function") {
    const shouldRestore = router.options.scrollRestoration({
      location: router.latestLocation
    });
    if (!shouldRestore) {
      return null;
    }
  }
  const getKey = router.options.getScrollRestorationKey || defaultGetScrollRestorationKey;
  const userKey = getKey(router.latestLocation);
  const resolvedKey = userKey !== defaultGetScrollRestorationKey(router.latestLocation) ? userKey : void 0;
  const restoreScrollOptions = {
    storageKey,
    shouldScrollRestoration: true
  };
  if (resolvedKey) {
    restoreScrollOptions.key = resolvedKey;
  }
  return createComponent(ScriptOnce, {
    get children() {
      return `(${restoreScroll.toString()})(${JSON.stringify(restoreScrollOptions)})`;
    }
  });
}
const Match = (props) => {
  const router = useRouter();
  const matchState = useRouterState({
    select: (s3) => {
      const match = s3.matches.find((d2) => d2.id === props.matchId);
      invariant(match, `Could not find match for matchId "${props.matchId}". Please file an issue!`);
      return {
        routeId: match.routeId,
        ssr: match.ssr,
        _displayPending: match._displayPending
      };
    }
  });
  const route = () => router.routesById[matchState().routeId];
  const PendingComponent = () => route().options.pendingComponent ?? router.options.defaultPendingComponent;
  const routeErrorComponent = () => route().options.errorComponent ?? router.options.defaultErrorComponent;
  const routeOnCatch = () => route().options.onCatch ?? router.options.defaultOnCatch;
  const routeNotFoundComponent = () => route().isRoot ? (
    // If it's the root route, use the globalNotFound option, with fallback to the notFoundRoute's component
    route().options.notFoundComponent ?? router.options.notFoundRoute?.options.component
  ) : route().options.notFoundComponent;
  const resolvedNoSsr = matchState().ssr === false || matchState().ssr === "data-only";
  const ResolvedSuspenseBoundary = () => (
    // If we're on the root route, allow forcefully wrapping in suspense
    (!route().isRoot || route().options.wrapInSuspense || resolvedNoSsr || matchState()._displayPending) && (route().options.wrapInSuspense ?? PendingComponent() ?? (route().options.errorComponent?.preload || resolvedNoSsr)) ? Suspense : SafeFragment
  );
  const ResolvedCatchBoundary = () => routeErrorComponent() ? CatchBoundary : SafeFragment;
  const ResolvedNotFoundBoundary = () => routeNotFoundComponent() ? CatchNotFound : SafeFragment;
  const resetKey = useRouterState({
    select: (s3) => s3.loadedAt
  });
  const parentRouteId = useRouterState({
    select: (s3) => {
      const index = s3.matches.findIndex((d2) => d2.id === props.matchId);
      return s3.matches[index - 1]?.routeId;
    }
  });
  const ShellComponent = route().isRoot ? route().options.shellComponent ?? SafeFragment : SafeFragment;
  return createComponent(ShellComponent, {
    get children() {
      return [createComponent(matchContext.Provider, {
        value: () => props.matchId,
        get children() {
          return createComponent(Dynamic, {
            get component() {
              return ResolvedSuspenseBoundary();
            },
            get fallback() {
              return createComponent(Dynamic, {
                get component() {
                  return PendingComponent();
                }
              });
            },
            get children() {
              return createComponent(Dynamic, {
                get component() {
                  return ResolvedCatchBoundary();
                },
                getResetKey: () => resetKey(),
                get errorComponent() {
                  return routeErrorComponent() || ErrorComponent;
                },
                onCatch: (error) => {
                  if (isNotFound(error)) throw error;
                  warning(false, `Error in route match: ${props.matchId}`);
                  routeOnCatch()?.(error);
                },
                get children() {
                  return createComponent(Dynamic, {
                    get component() {
                      return ResolvedNotFoundBoundary();
                    },
                    fallback: (error) => {
                      if (!routeNotFoundComponent() || error.routeId && error.routeId !== matchState().routeId || !error.routeId && !route().isRoot) throw error;
                      return createComponent(Dynamic, mergeProps({
                        get component() {
                          return routeNotFoundComponent();
                        }
                      }, error));
                    },
                    get children() {
                      return createComponent(Switch, {
                        get children() {
                          return [createComponent(Match$1, {
                            when: resolvedNoSsr,
                            get children() {
                              return createComponent(Show, {
                                get when() {
                                  return !router.isServer;
                                },
                                get fallback() {
                                  return createComponent(Dynamic, {
                                    get component() {
                                      return PendingComponent();
                                    }
                                  });
                                },
                                get children() {
                                  return createComponent(MatchInner, {
                                    get matchId() {
                                      return props.matchId;
                                    }
                                  });
                                }
                              });
                            }
                          }), createComponent(Match$1, {
                            when: !resolvedNoSsr,
                            get children() {
                              return createComponent(MatchInner, {
                                get matchId() {
                                  return props.matchId;
                                }
                              });
                            }
                          })];
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      }), parentRouteId() === rootRouteId ? [createComponent(OnRendered, {}), createComponent(ScrollRestoration, {})] : null];
    }
  });
};
function OnRendered() {
  const router = useRouter();
  const location = useRouterState({
    select: (s3) => {
      return s3.resolvedLocation?.state.__TSR_key;
    }
  });
  createEffect(on([location], () => {
    router.emit({
      type: "onRendered",
      ...getLocationChangeInfo(router.state)
    });
  }));
  return null;
}
const MatchInner = (props) => {
  const router = useRouter();
  const matchState = useRouterState({
    select: (s3) => {
      const match2 = s3.matches.find((d2) => d2.id === props.matchId);
      const routeId = match2.routeId;
      const remountFn = router.routesById[routeId].options.remountDeps ?? router.options.defaultRemountDeps;
      const remountDeps = remountFn?.({
        routeId,
        loaderDeps: match2.loaderDeps,
        params: match2._strictParams,
        search: match2._strictSearch
      });
      const key = remountDeps ? JSON.stringify(remountDeps) : void 0;
      return {
        key,
        routeId,
        match: {
          id: match2.id,
          status: match2.status,
          error: match2.error,
          _forcePending: match2._forcePending,
          _displayPending: match2._displayPending
        }
      };
    }
  });
  const route = () => router.routesById[matchState().routeId];
  const match = () => matchState().match;
  const out = () => {
    const Comp = route().options.component ?? router.options.defaultComponent;
    if (Comp) {
      const key = matchState().key ?? matchState().match.id;
      return createComponent(Show, {
        when: key,
        keyed: true,
        get children() {
          return createComponent(Comp, {});
        }
      });
    }
    return createComponent(Outlet, {});
  };
  return createComponent(Switch, {
    get children() {
      return [createComponent(Match$1, {
        get when() {
          return match()._displayPending;
        },
        children: (_2) => {
          const [displayPendingResult] = createResource(() => router.getMatch(match().id)?._nonReactive.displayPendingPromise);
          return displayPendingResult();
        }
      }), createComponent(Match$1, {
        get when() {
          return match()._forcePending;
        },
        children: (_2) => {
          const [minPendingResult] = createResource(() => router.getMatch(match().id)?._nonReactive.minPendingPromise);
          return minPendingResult();
        }
      }), createComponent(Match$1, {
        get when() {
          return match().status === "pending";
        },
        children: (_2) => {
          const pendingMinMs = route().options.pendingMinMs ?? router.options.defaultPendingMinMs;
          if (pendingMinMs) {
            const routerMatch = router.getMatch(match().id);
            if (routerMatch && !routerMatch._nonReactive.minPendingPromise) {
              if (!router.isServer) {
                const minPendingPromise = createControlledPromise();
                routerMatch._nonReactive.minPendingPromise = minPendingPromise;
                setTimeout(() => {
                  minPendingPromise.resolve();
                  routerMatch._nonReactive.minPendingPromise = void 0;
                }, pendingMinMs);
              }
            }
          }
          const [loaderResult] = createResource(async () => {
            await new Promise((r) => setTimeout(r, 0));
            return router.getMatch(match().id)?._nonReactive.loadPromise;
          });
          return loaderResult();
        }
      }), createComponent(Match$1, {
        get when() {
          return match().status === "notFound";
        },
        children: (_2) => {
          invariant(isNotFound(match().error));
          return renderRouteNotFound(router, route(), match().error);
        }
      }), createComponent(Match$1, {
        get when() {
          return match().status === "redirected";
        },
        children: (_2) => {
          invariant(isRedirect(match().error));
          const [loaderResult] = createResource(async () => {
            await new Promise((r) => setTimeout(r, 0));
            return router.getMatch(match().id)?._nonReactive.loadPromise;
          });
          return loaderResult();
        }
      }), createComponent(Match$1, {
        get when() {
          return match().status === "error";
        },
        children: (_2) => {
          if (router.isServer) {
            const RouteErrorComponent = (route().options.errorComponent ?? router.options.defaultErrorComponent) || ErrorComponent;
            return createComponent(RouteErrorComponent, {
              get error() {
                return match().error;
              },
              info: {
                componentStack: ""
              }
            });
          }
          throw match().error;
        }
      }), createComponent(Match$1, {
        get when() {
          return match().status === "success";
        },
        get children() {
          return out();
        }
      })];
    }
  });
};
const Outlet = () => {
  const router = useRouter();
  const matchId = useContext(matchContext);
  const routeId = useRouterState({
    select: (s3) => s3.matches.find((d2) => d2.id === matchId())?.routeId
  });
  const route = () => router.routesById[routeId()];
  const parentGlobalNotFound = useRouterState({
    select: (s3) => {
      const matches = s3.matches;
      const parentMatch = matches.find((d2) => d2.id === matchId());
      invariant(parentMatch, `Could not find parent match for matchId "${matchId()}"`);
      return parentMatch.globalNotFound;
    }
  });
  const childMatchId = useRouterState({
    select: (s3) => {
      const matches = s3.matches;
      const index = matches.findIndex((d2) => d2.id === matchId());
      const v4 = matches[index + 1]?.id;
      return v4;
    }
  });
  return createComponent(Switch, {
    get children() {
      return [createComponent(Match$1, {
        get when() {
          return parentGlobalNotFound();
        },
        get children() {
          return renderRouteNotFound(router, route(), void 0);
        }
      }), createComponent(Match$1, {
        get when() {
          return childMatchId();
        },
        children: (matchId2) => {
          return createComponent(Show, {
            get when() {
              return matchId2() === rootRouteId;
            },
            get fallback() {
              return createComponent(Match, {
                get matchId() {
                  return matchId2();
                }
              });
            },
            get children() {
              return createComponent(Suspense, {
                get fallback() {
                  return createComponent(Dynamic, {
                    get component() {
                      return router.options.defaultPendingComponent;
                    }
                  });
                },
                get children() {
                  return createComponent(Match, {
                    get matchId() {
                      return matchId2();
                    }
                  });
                }
              });
            }
          });
        }
      })];
    }
  });
};
function Matches() {
  const router = useRouter();
  const ResolvedSuspense = router.isServer || typeof document !== "undefined" && router.ssr ? SafeFragment : Suspense;
  const OptionalWrapper = router.options.InnerWrap || SafeFragment;
  return createComponent(OptionalWrapper, {
    get children() {
      return createComponent(ResolvedSuspense, {
        get fallback() {
          return router.options.defaultPendingComponent ? createComponent(router.options.defaultPendingComponent, {}) : null;
        },
        get children() {
          return [!router.isServer && createComponent(Transitioner, {}), createComponent(MatchesInner, {})];
        }
      });
    }
  });
}
function MatchesInner() {
  const router = useRouter();
  const matchId = useRouterState({
    select: (s3) => {
      return s3.matches[0]?.id;
    }
  });
  const resetKey = useRouterState({
    select: (s3) => s3.loadedAt
  });
  const matchComponent = () => {
    const id = matchId();
    return id ? createComponent(Match, {
      matchId: id
    }) : null;
  };
  return createComponent(matchContext.Provider, {
    value: matchId,
    get children() {
      return router.options.disableGlobalCatchBoundary ? matchComponent() : createComponent(CatchBoundary, {
        getResetKey: () => resetKey(),
        errorComponent: ErrorComponent,
        onCatch: (error) => {
          warning(false, error.message || error.toString());
        },
        get children() {
          return matchComponent();
        }
      });
    }
  });
}
function RouterContextProvider({
  router,
  children: children2,
  ...rest
}) {
  router.update({
    ...router.options,
    ...rest,
    context: {
      ...router.options.context,
      ...rest.context
    }
  });
  const routerContext2 = getRouterContext();
  const OptionalWrapper = router.options.Wrap || SafeFragment;
  return createComponent(OptionalWrapper, {
    get children() {
      return createComponent(routerContext2.Provider, {
        value: router,
        get children() {
          return children2();
        }
      });
    }
  });
}
function RouterProvider({
  router,
  ...rest
}) {
  return createComponent(RouterContextProvider, mergeProps({
    router
  }, rest, {
    children: () => createComponent(Matches, {})
  }));
}
const MetaContext = createContext();
const cascadingTags = ["title", "meta"];
const titleTagProperties = [];
const metaTagProperties = (
  // https://html.spec.whatwg.org/multipage/semantics.html#the-meta-element
  ["name", "http-equiv", "content", "charset", "media"].concat(["property"])
);
const getTagKey = (tag, properties) => {
  const tagProps = Object.fromEntries(Object.entries(tag.props).filter(([k2]) => properties.includes(k2)).sort());
  if (Object.hasOwn(tagProps, "name") || Object.hasOwn(tagProps, "property")) {
    tagProps.name = tagProps.name || tagProps.property;
    delete tagProps.property;
  }
  return tag.tag + JSON.stringify(tagProps);
};
function initServerProvider() {
  const tags = [];
  useAssets(() => ssr(renderTags(tags)));
  return {
    addTag(tagDesc) {
      if (cascadingTags.indexOf(tagDesc.tag) !== -1) {
        const properties = tagDesc.tag === "title" ? titleTagProperties : metaTagProperties;
        const tagDescKey = getTagKey(tagDesc, properties);
        const index = tags.findIndex((prev) => prev.tag === tagDesc.tag && getTagKey(prev, properties) === tagDescKey);
        if (index !== -1) {
          tags.splice(index, 1);
        }
      }
      tags.push(tagDesc);
      return tags.length;
    },
    removeTag(tag, index) {
    }
  };
}
const MetaProvider = (props) => {
  const actions = initServerProvider();
  return createComponent(MetaContext.Provider, {
    value: actions,
    get children() {
      return props.children;
    }
  });
};
const MetaTag = (tag, props, setting) => {
  useHead({
    tag,
    props,
    setting,
    id: createUniqueId(),
    get name() {
      return props.name || props.property;
    }
  });
  return null;
};
function useHead(tagDesc) {
  const c2 = useContext(MetaContext);
  if (!c2) throw new Error("<MetaProvider /> should be in the tree");
  createRenderEffect(() => {
    const index = c2.addTag(tagDesc);
    onCleanup(() => c2.removeTag(tagDesc, index));
  });
}
function renderTags(tags) {
  return tags.map((tag) => {
    const keys = Object.keys(tag.props);
    const props = keys.map((k2) => k2 === "children" ? "" : ` ${k2}="${// @ts-expect-error
    escape(tag.props[k2], true)}"`).join("");
    let children2 = tag.props.children;
    if (Array.isArray(children2)) {
      children2 = children2.join("");
    }
    if (tag.setting?.close) {
      return `<${tag.tag} data-sm="${tag.id}"${props}>${// @ts-expect-error
      tag.setting?.escape ? escape(children2) : children2 || ""}</${tag.tag}>`;
    }
    return `<${tag.tag} data-sm="${tag.id}"${props}/>`;
  }).join("");
}
const Title = (props) => MetaTag("title", props, {
  escape: true,
  close: true
});
const Style = (props) => MetaTag("style", props, {
  close: true
});
const Meta = (props) => MetaTag("meta", props);
function Asset({
  tag,
  attrs,
  children: children2
}) {
  switch (tag) {
    case "title":
      return createComponent(Title, mergeProps(attrs, {
        children: children2
      }));
    case "meta":
      return createComponent(Meta, attrs);
    case "link":
      return ssrElement("link", attrs, void 0);
    case "style":
      return createComponent(Style, mergeProps(attrs, {
        innerHTML: children2
      }));
    case "script":
      return createComponent(Script, {
        attrs,
        children: children2
      });
    default:
      return null;
  }
}
function Script({
  attrs,
  children: children2
}) {
  const router = useRouter();
  if (router && !router.isServer) {
    return null;
  }
  if (attrs?.src && typeof attrs.src === "string") {
    return ssrElement("script", attrs, void 0);
  }
  if (typeof children2 === "string") {
    return ssrElement("script", mergeProps(attrs, {
      innerHTML: children2
    }), void 0);
  }
  return null;
}
const useTags = () => {
  const router = useRouter();
  const routeMeta = useRouterState({
    select: (state) => {
      return state.matches.map((match) => match.meta).filter(Boolean);
    }
  });
  const meta = createMemo(() => {
    const resultMeta = [];
    const metaByAttribute = {};
    let title;
    const routeMetasArray = routeMeta();
    for (let i2 = routeMetasArray.length - 1; i2 >= 0; i2--) {
      const metas = routeMetasArray[i2];
      for (let j2 = metas.length - 1; j2 >= 0; j2--) {
        const m2 = metas[j2];
        if (!m2) continue;
        if (m2.title) {
          if (!title) {
            title = {
              tag: "title",
              children: m2.title
            };
          }
        } else {
          const attribute = m2.name ?? m2.property;
          if (attribute) {
            if (metaByAttribute[attribute]) {
              continue;
            } else {
              metaByAttribute[attribute] = true;
            }
          }
          resultMeta.push({
            tag: "meta",
            attrs: {
              ...m2
            }
          });
        }
      }
    }
    if (title) {
      resultMeta.push(title);
    }
    resultMeta.reverse();
    return resultMeta;
  });
  const links = useRouterState({
    select: (state) => {
      const constructed = state.matches.map((match) => match.links).filter(Boolean).flat(1).map((link) => ({
        tag: "link",
        attrs: {
          ...link
        }
      }));
      const manifest = router.ssr?.manifest;
      const assets = state.matches.map((match) => manifest?.routes[match.routeId]?.assets ?? []).filter(Boolean).flat(1).filter((asset) => asset.tag === "link").map((asset) => ({
        tag: "link",
        attrs: asset.attrs
      }));
      return [...constructed, ...assets];
    }
  });
  const preloadMeta = useRouterState({
    select: (state) => {
      const preloadMeta2 = [];
      state.matches.map((match) => router.looseRoutesById[match.routeId]).forEach((route) => router.ssr?.manifest?.routes[route.id]?.preloads?.filter(Boolean).forEach((preload) => {
        preloadMeta2.push({
          tag: "link",
          attrs: {
            rel: "modulepreload",
            href: preload
          }
        });
      }));
      return preloadMeta2;
    }
  });
  const styles = useRouterState({
    select: (state) => state.matches.map((match) => match.styles).flat(1).filter(Boolean).map(({
      children: children2,
      ...style
    }) => ({
      tag: "style",
      attrs: {
        ...style
      },
      children: children2
    }))
  });
  const headScripts = useRouterState({
    select: (state) => state.matches.map((match) => match.headScripts).flat(1).filter(Boolean).map(({
      children: children2,
      ...script
    }) => ({
      tag: "script",
      attrs: {
        ...script
      },
      children: children2
    }))
  });
  return () => uniqBy([...meta(), ...preloadMeta(), ...links(), ...styles(), ...headScripts()], (d2) => {
    return JSON.stringify(d2);
  });
};
function HeadContent() {
  const tags = useTags();
  return createComponent(MetaProvider, {
    get children() {
      return tags().map((tag) => createComponent(Asset, tag));
    }
  });
}
function uniqBy(arr, fn) {
  const seen = /* @__PURE__ */ new Set();
  return arr.filter((item) => {
    const key = fn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
const Scripts = () => {
  const router = useRouter();
  const assetScripts = useRouterState({
    select: (state) => {
      const assetScripts2 = [];
      const manifest = router.ssr?.manifest;
      if (!manifest) {
        return [];
      }
      state.matches.map((match) => router.looseRoutesById[match.routeId]).forEach((route) => manifest.routes[route.id]?.assets?.filter((d2) => d2.tag === "script").forEach((asset) => {
        assetScripts2.push({
          tag: "script",
          attrs: asset.attrs,
          children: asset.children
        });
      }));
      return assetScripts2;
    }
  });
  const scripts = useRouterState({
    select: (state) => ({
      scripts: state.matches.map((match) => match.scripts).flat(1).filter(Boolean).map(({
        children: children2,
        ...script
      }) => ({
        tag: "script",
        attrs: {
          ...script
        },
        children: children2
      }))
    })
  });
  const allScripts = [...scripts().scripts, ...assetScripts()];
  return allScripts.map((asset, i2) => createComponent(Asset, asset));
};
var _tmpl$ = ["<head>", "</head>"], _tmpl$2 = ["<html>", "<body>", "</body></html>"];
function ServerHeadContent() {
  const tags = useTags();
  useAssets(() => {
    return createComponent(MetaProvider, {
      get children() {
        return tags().map((tag) => createComponent(Asset, tag));
      }
    });
  });
  return null;
}
const docType = ssr("<!DOCTYPE html>");
function StartServer(props) {
  return createComponent(NoHydration, {
    get children() {
      return [docType, ssr(_tmpl$2, createComponent(NoHydration, {
        get children() {
          return ssr(_tmpl$, escape(createComponent(HydrationScript, {})));
        }
      }), escape(createComponent(Hydration, {
        get children() {
          return createComponent(RouterProvider, {
            get router() {
              return props.router;
            },
            InnerWrap: (props2) => createComponent(NoHydration, {
              get children() {
                return createComponent(MetaProvider, {
                  get children() {
                    return [createComponent(ServerHeadContent, {}), createComponent(Hydration, {
                      get children() {
                        return props2.children;
                      }
                    }), createComponent(Scripts, {})];
                  }
                });
              }
            })
          });
        }
      })))];
    }
  });
}
function splitSetCookieString$1(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c2) => splitSetCookieString$1(c2));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}
function toHeadersInstance(init) {
  if (init instanceof Headers) {
    return new Headers(init);
  } else if (Array.isArray(init)) {
    return new Headers(init);
  } else if (typeof init === "object") {
    return new Headers(init);
  } else {
    return new Headers();
  }
}
function mergeHeaders(...headers) {
  return headers.reduce((acc, header) => {
    const headersInstance = toHeadersInstance(header);
    for (const [key, value] of headersInstance.entries()) {
      if (key === "set-cookie") {
        const splitCookies = splitSetCookieString$1(value);
        splitCookies.forEach((cookie) => acc.append("set-cookie", cookie));
      } else {
        acc.set(key, value);
      }
    }
    return acc;
  }, new Headers());
}
function json(payload, init) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: mergeHeaders(
      { "content-type": "application/json" },
      init?.headers
    )
  });
}
const TSS_FORMDATA_CONTEXT = "__TSS_CONTEXT";
const TSS_SERVER_FUNCTION = Symbol.for("TSS_SERVER_FUNCTION");
const X_TSS_SERIALIZED = "x-tss-serialized";
const X_TSS_RAW_RESPONSE = "x-tss-raw";
const startStorage = new AsyncLocalStorage();
async function runWithStartContext(context, fn) {
  return startStorage.run(context, fn);
}
function getStartContext(opts) {
  const context = startStorage.getStore();
  if (!context && opts?.throwIfNotFound !== false) {
    throw new Error(
      `No Start context found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`
    );
  }
  return context;
}
const getStartOptions = () => getStartContext().startOptions;
function flattenMiddlewares(middlewares) {
  const seen = /* @__PURE__ */ new Set();
  const flattened = [];
  const recurse = (middleware) => {
    middleware.forEach((m2) => {
      if (m2.options.middleware) {
        recurse(m2.options.middleware);
      }
      if (!seen.has(m2)) {
        seen.add(m2);
        flattened.push(m2);
      }
    });
  };
  recurse(middlewares);
  return flattened;
}
function getDefaultSerovalPlugins() {
  const start = getStartOptions();
  const adapters = start?.serializationAdapters;
  return [
    ...adapters?.map(makeSerovalPlugin) ?? [],
    ...defaultSerovalPlugins
  ];
}
const minifiedTsrBootStrapScript = 'self.$_TSR={c(){document.querySelectorAll(".\\\\$tsr").forEach(e=>{e.remove()})},p(e){this.initialized?e():this.buffer.push(e)},buffer:[]};\n';
const SCOPE_ID = "tsr";
function dehydrateMatch(match) {
  const dehydratedMatch = {
    i: match.id,
    u: match.updatedAt,
    s: match.status
  };
  const properties = [
    ["__beforeLoadContext", "b"],
    ["loaderData", "l"],
    ["error", "e"],
    ["ssr", "ssr"]
  ];
  for (const [key, shorthand] of properties) {
    if (match[key] !== void 0) {
      dehydratedMatch[shorthand] = match[key];
    }
  }
  return dehydratedMatch;
}
function attachRouterServerSsrUtils({
  router,
  manifest
}) {
  router.ssr = {
    manifest
  };
  let initialScriptSent = false;
  const getInitialScript = () => {
    if (initialScriptSent) {
      return "";
    }
    initialScriptSent = true;
    return `${xr(SCOPE_ID)};${minifiedTsrBootStrapScript};`;
  };
  let _dehydrated = false;
  const listeners = [];
  router.serverSsr = {
    injectedHtml: [],
    injectHtml: (getHtml) => {
      const promise = Promise.resolve().then(getHtml);
      router.serverSsr.injectedHtml.push(promise);
      router.emit({
        type: "onInjectedHtml",
        promise
      });
      return promise.then(() => {
      });
    },
    injectScript: (getScript) => {
      return router.serverSsr.injectHtml(async () => {
        const script = await getScript();
        return `<script ${router.options.ssr?.nonce ? `nonce='${router.options.ssr.nonce}'` : ""} class='$tsr'>${getInitialScript()}${script};$_TSR.c()<\/script>`;
      });
    },
    dehydrate: async () => {
      invariant(!_dehydrated);
      let matchesToDehydrate = router.state.matches;
      if (router.isShell()) {
        matchesToDehydrate = matchesToDehydrate.slice(0, 1);
      }
      const matches = matchesToDehydrate.map(dehydrateMatch);
      const dehydratedRouter = {
        manifest: router.ssr.manifest,
        matches
      };
      const lastMatchId = matchesToDehydrate[matchesToDehydrate.length - 1]?.id;
      if (lastMatchId) {
        dehydratedRouter.lastMatchId = lastMatchId;
      }
      dehydratedRouter.dehydratedData = await router.options.dehydrate?.();
      _dehydrated = true;
      const p2 = createControlledPromise();
      const trackPlugins = { didRun: false };
      const plugins = router.options.serializationAdapters?.map((t) => makeSsrSerovalPlugin(t, trackPlugins)) ?? [];
      gr(dehydratedRouter, {
        refs: /* @__PURE__ */ new Map(),
        plugins: [...plugins, ...defaultSerovalPlugins],
        onSerialize: (data, initial) => {
          let serialized = initial ? GLOBAL_TSR + ".router=" + data : data;
          if (trackPlugins.didRun) {
            serialized = GLOBAL_TSR + ".p(()=>" + serialized + ")";
          }
          router.serverSsr.injectScript(() => serialized);
        },
        scopeId: SCOPE_ID,
        onDone: () => p2.resolve(""),
        onError: (err) => p2.reject(err)
      });
      router.serverSsr.injectHtml(() => p2);
    },
    isDehydrated() {
      return _dehydrated;
    },
    onRenderFinished: (listener) => listeners.push(listener),
    setRenderFinished: () => {
      listeners.forEach((l2) => l2());
    }
  };
}
function getOrigin(request) {
  const originHeader = request.headers.get("Origin");
  if (originHeader) {
    try {
      new URL(originHeader);
      return originHeader;
    } catch {
    }
  }
  try {
    return new URL(request.url).origin;
  } catch {
  }
  return "http://localhost";
}
function defineHandlerCallback(handler) {
  return handler;
}
function transformReadableStreamWithRouter(router, routerStream) {
  return transformStreamWithRouter(router, routerStream);
}
const patternBodyStart = /(<body)/;
const patternBodyEnd = /(<\/body>)/;
const patternHtmlEnd = /(<\/html>)/;
const patternHeadStart = /(<head.*?>)/;
const patternClosingTag = /(<\/[a-zA-Z][\w:.-]*?>)/g;
const textDecoder = new TextDecoder();
function createPassthrough() {
  let controller;
  const encoder = new TextEncoder();
  const stream = new ReadableStream$1({
    start(c2) {
      controller = c2;
    }
  });
  const res = {
    stream,
    write: (chunk) => {
      controller.enqueue(encoder.encode(chunk));
    },
    end: (chunk) => {
      if (chunk) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
      res.destroyed = true;
    },
    destroy: (error) => {
      controller.error(error);
    },
    destroyed: false
  };
  return res;
}
async function readStream(stream, opts) {
  try {
    const reader = stream.getReader();
    let chunk;
    while (!(chunk = await reader.read()).done) {
      opts.onData?.(chunk);
    }
    opts.onEnd?.();
  } catch (error) {
    opts.onError?.(error);
  }
}
function transformStreamWithRouter(router, appStream) {
  const finalPassThrough = createPassthrough();
  let isAppRendering = true;
  let routerStreamBuffer = "";
  let pendingClosingTags = "";
  let bodyStarted = false;
  let headStarted = false;
  let leftover = "";
  let leftoverHtml = "";
  function getBufferedRouterStream() {
    const html = routerStreamBuffer;
    routerStreamBuffer = "";
    return html;
  }
  function decodeChunk(chunk) {
    if (chunk instanceof Uint8Array) {
      return textDecoder.decode(chunk);
    }
    return String(chunk);
  }
  const injectedHtmlDonePromise = createControlledPromise();
  let processingCount = 0;
  router.serverSsr.injectedHtml.forEach((promise) => {
    handleInjectedHtml(promise);
  });
  const stopListeningToInjectedHtml = router.subscribe(
    "onInjectedHtml",
    (e) => {
      handleInjectedHtml(e.promise);
    }
  );
  function handleInjectedHtml(promise) {
    processingCount++;
    promise.then((html) => {
      if (!bodyStarted) {
        routerStreamBuffer += html;
      } else {
        finalPassThrough.write(html);
      }
    }).catch(injectedHtmlDonePromise.reject).finally(() => {
      processingCount--;
      if (!isAppRendering && processingCount === 0) {
        stopListeningToInjectedHtml();
        injectedHtmlDonePromise.resolve();
      }
    });
  }
  injectedHtmlDonePromise.then(() => {
    const finalHtml = leftoverHtml + getBufferedRouterStream() + pendingClosingTags;
    finalPassThrough.end(finalHtml);
  }).catch((err) => {
    console.error("Error reading routerStream:", err);
    finalPassThrough.destroy(err);
  });
  readStream(appStream, {
    onData: (chunk) => {
      const text = decodeChunk(chunk.value);
      let chunkString = leftover + text;
      const bodyEndMatch = chunkString.match(patternBodyEnd);
      const htmlEndMatch = chunkString.match(patternHtmlEnd);
      if (!bodyStarted) {
        const bodyStartMatch = chunkString.match(patternBodyStart);
        if (bodyStartMatch) {
          bodyStarted = true;
        }
      }
      if (!headStarted) {
        const headStartMatch = chunkString.match(patternHeadStart);
        if (headStartMatch) {
          headStarted = true;
          const index = headStartMatch.index;
          const headTag = headStartMatch[0];
          const remaining = chunkString.slice(index + headTag.length);
          finalPassThrough.write(
            chunkString.slice(0, index) + headTag + getBufferedRouterStream()
          );
          chunkString = remaining;
        }
      }
      if (!bodyStarted) {
        finalPassThrough.write(chunkString);
        leftover = "";
        return;
      }
      if (bodyEndMatch && htmlEndMatch && bodyEndMatch.index < htmlEndMatch.index) {
        const bodyEndIndex = bodyEndMatch.index;
        pendingClosingTags = chunkString.slice(bodyEndIndex);
        finalPassThrough.write(
          chunkString.slice(0, bodyEndIndex) + getBufferedRouterStream()
        );
        leftover = "";
        return;
      }
      let result;
      let lastIndex = 0;
      while ((result = patternClosingTag.exec(chunkString)) !== null) {
        lastIndex = result.index + result[0].length;
      }
      if (lastIndex > 0) {
        const processed = chunkString.slice(0, lastIndex) + getBufferedRouterStream() + leftoverHtml;
        finalPassThrough.write(processed);
        leftover = chunkString.slice(lastIndex);
      } else {
        leftover = chunkString;
        leftoverHtml += getBufferedRouterStream();
      }
    },
    onEnd: () => {
      isAppRendering = false;
      router.serverSsr.setRenderFinished();
      if (processingCount === 0) {
        injectedHtmlDonePromise.resolve();
      }
    },
    onError: (error) => {
      console.error("Error reading appStream:", error);
      finalPassThrough.destroy(error);
    }
  });
  return finalPassThrough.stream;
}
const NullProtoObj = /* @__PURE__ */ (() => {
  const e = function() {
  };
  return e.prototype = /* @__PURE__ */ Object.create(null), Object.freeze(e.prototype), e;
})();
function splitSetCookieString(cookiesString) {
  if (Array.isArray(cookiesString)) return cookiesString.flatMap((c2) => splitSetCookieString(c2));
  if (typeof cookiesString !== "string") return [];
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) pos += 1;
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) pos += 1;
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else pos = lastComma + 1;
      } else pos += 1;
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) cookiesStrings.push(cookiesString.slice(start));
  }
  return cookiesStrings;
}
function lazyInherit(target, source, sourceKey) {
  for (const key of Object.getOwnPropertyNames(source)) {
    if (key === "constructor") continue;
    const targetDesc = Object.getOwnPropertyDescriptor(target, key);
    const desc = Object.getOwnPropertyDescriptor(source, key);
    let modified = false;
    if (desc.get) {
      modified = true;
      desc.get = targetDesc?.get || function() {
        return this[sourceKey][key];
      };
    }
    if (desc.set) {
      modified = true;
      desc.set = targetDesc?.set || function(value) {
        this[sourceKey][key] = value;
      };
    }
    if (typeof desc.value === "function") {
      modified = true;
      desc.value = function(...args) {
        return this[sourceKey][key](...args);
      };
    }
    if (modified) Object.defineProperty(target, key, desc);
  }
}
const FastURL = /* @__PURE__ */ (() => {
  const NativeURL = globalThis.URL;
  const FastURL$1 = class URL {
    #url;
    #href;
    #protocol;
    #host;
    #pathname;
    #search;
    #searchParams;
    #pos;
    constructor(url) {
      if (typeof url === "string") this.#href = url;
      else {
        this.#protocol = url.protocol;
        this.#host = url.host;
        this.#pathname = url.pathname;
        this.#search = url.search;
      }
    }
    get _url() {
      if (this.#url) return this.#url;
      this.#url = new NativeURL(this.href);
      this.#href = void 0;
      this.#protocol = void 0;
      this.#host = void 0;
      this.#pathname = void 0;
      this.#search = void 0;
      this.#searchParams = void 0;
      this.#pos = void 0;
      return this.#url;
    }
    get href() {
      if (this.#url) return this.#url.href;
      if (!this.#href) this.#href = `${this.#protocol || "http:"}//${this.#host || "localhost"}${this.#pathname || "/"}${this.#search || ""}`;
      return this.#href;
    }
    #getPos() {
      if (!this.#pos) {
        const url = this.href;
        const protoIndex = url.indexOf("://");
        const pathnameIndex = protoIndex === -1 ? -1 : url.indexOf("/", protoIndex + 4);
        const qIndex = pathnameIndex === -1 ? -1 : url.indexOf("?", pathnameIndex);
        this.#pos = [
          protoIndex,
          pathnameIndex,
          qIndex
        ];
      }
      return this.#pos;
    }
    get pathname() {
      if (this.#url) return this.#url.pathname;
      if (this.#pathname === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.pathname;
        this.#pathname = this.href.slice(pathnameIndex, queryIndex === -1 ? void 0 : queryIndex);
      }
      return this.#pathname;
    }
    get search() {
      if (this.#url) return this.#url.search;
      if (this.#search === void 0) {
        const [, pathnameIndex, queryIndex] = this.#getPos();
        if (pathnameIndex === -1) return this._url.search;
        const url = this.href;
        this.#search = queryIndex === -1 || queryIndex === url.length - 1 ? "" : url.slice(queryIndex);
      }
      return this.#search;
    }
    get searchParams() {
      if (this.#url) return this.#url.searchParams;
      if (!this.#searchParams) this.#searchParams = new URLSearchParams(this.search);
      return this.#searchParams;
    }
    get protocol() {
      if (this.#url) return this.#url.protocol;
      if (this.#protocol === void 0) {
        const [protocolIndex] = this.#getPos();
        if (protocolIndex === -1) return this._url.protocol;
        const url = this.href;
        this.#protocol = url.slice(0, protocolIndex + 1);
      }
      return this.#protocol;
    }
    toString() {
      return this.href;
    }
    toJSON() {
      return this.href;
    }
  };
  lazyInherit(FastURL$1.prototype, NativeURL.prototype, "_url");
  Object.setPrototypeOf(FastURL$1.prototype, NativeURL.prototype);
  Object.setPrototypeOf(FastURL$1, NativeURL);
  return FastURL$1;
})();
const NodeResponse = /* @__PURE__ */ (() => {
  const NativeResponse = globalThis.Response;
  const STATUS_CODES = globalThis.process?.getBuiltinModule?.("node:http")?.STATUS_CODES || {};
  class NodeResponse$1 {
    #body;
    #init;
    #headers;
    #response;
    constructor(body, init) {
      this.#body = body;
      this.#init = init;
    }
    get status() {
      return this.#response?.status || this.#init?.status || 200;
    }
    get statusText() {
      return this.#response?.statusText || this.#init?.statusText || STATUS_CODES[this.status] || "";
    }
    get headers() {
      if (this.#response) return this.#response.headers;
      if (this.#headers) return this.#headers;
      const initHeaders = this.#init?.headers;
      return this.#headers = initHeaders instanceof Headers ? initHeaders : new Headers(initHeaders);
    }
    get ok() {
      if (this.#response) return this.#response.ok;
      const status = this.status;
      return status >= 200 && status < 300;
    }
    get _response() {
      if (this.#response) return this.#response;
      this.#response = new NativeResponse(this.#body, this.#headers ? {
        ...this.#init,
        headers: this.#headers
      } : this.#init);
      this.#init = void 0;
      this.#headers = void 0;
      this.#body = void 0;
      return this.#response;
    }
    nodeResponse() {
      const status = this.status;
      const statusText = this.statusText;
      let body;
      let contentType;
      let contentLength;
      if (this.#response) body = this.#response.body;
      else if (this.#body) if (this.#body instanceof ReadableStream) body = this.#body;
      else if (typeof this.#body === "string") {
        body = this.#body;
        contentType = "text/plain; charset=UTF-8";
        contentLength = Buffer.byteLength(this.#body);
      } else if (this.#body instanceof ArrayBuffer) {
        body = Buffer.from(this.#body);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Uint8Array) {
        body = this.#body;
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof DataView) {
        body = Buffer.from(this.#body.buffer);
        contentLength = this.#body.byteLength;
      } else if (this.#body instanceof Blob) {
        body = this.#body.stream();
        contentType = this.#body.type;
        contentLength = this.#body.size;
      } else if (typeof this.#body.pipe === "function") body = this.#body;
      else body = this._response.body;
      const rawNodeHeaders = [];
      const initHeaders = this.#init?.headers;
      const headerEntries = this.#response?.headers || this.#headers || (initHeaders ? Array.isArray(initHeaders) ? initHeaders : initHeaders?.entries ? initHeaders.entries() : Object.entries(initHeaders).map(([k2, v4]) => [k2.toLowerCase(), v4]) : void 0);
      let hasContentTypeHeader;
      let hasContentLength;
      if (headerEntries) for (const [key, value] of headerEntries) {
        if (key === "set-cookie") {
          for (const setCookie of splitSetCookieString(value)) rawNodeHeaders.push(["set-cookie", setCookie]);
          continue;
        }
        rawNodeHeaders.push([key, value]);
        if (key === "content-type") hasContentTypeHeader = true;
        else if (key === "content-length") hasContentLength = true;
      }
      if (contentType && !hasContentTypeHeader) rawNodeHeaders.push(["content-type", contentType]);
      if (contentLength && !hasContentLength) rawNodeHeaders.push(["content-length", String(contentLength)]);
      this.#init = void 0;
      this.#headers = void 0;
      this.#response = void 0;
      this.#body = void 0;
      return {
        status,
        statusText,
        headers: rawNodeHeaders,
        body
      };
    }
  }
  lazyInherit(NodeResponse$1.prototype, NativeResponse.prototype, "_response");
  Object.setPrototypeOf(NodeResponse$1, NativeResponse);
  Object.setPrototypeOf(NodeResponse$1.prototype, NativeResponse.prototype);
  return NodeResponse$1;
})();
var H3Event = class {
  /**
  * Access to the H3 application instance.
  */
  app;
  /**
  * Incoming HTTP request info.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
  */
  req;
  /**
  * Access to the parsed request URL.
  *
  * [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
  */
  url;
  /**
  * Event context.
  */
  context;
  /**
  * @internal
  */
  static __is_event__ = true;
  /**
  * @internal
  */
  _res;
  constructor(req, context, app) {
    this.context = context || req.context || new NullProtoObj();
    this.req = req;
    this.app = app;
    const _url = req._url;
    this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
  }
  /**
  * Prepared HTTP response.
  */
  get res() {
    if (!this._res) this._res = new H3EventResponse();
    return this._res;
  }
  /**
  * Access to runtime specific additional context.
  *
  */
  get runtime() {
    return this.req.runtime;
  }
  /**
  * Tell the runtime about an ongoing operation that shouldn't close until the promise resolves.
  */
  waitUntil(promise) {
    this.req.waitUntil?.(promise);
  }
  toString() {
    return `[${this.req.method}] ${this.req.url}`;
  }
  toJSON() {
    return this.toString();
  }
  /**
  * Access to the raw Node.js req/res objects.
  *
  * @deprecated Use `event.runtime.{node|deno|bun|...}.` instead.
  */
  get node() {
    return this.req.runtime?.node;
  }
  /**
  * Access to the incoming request headers.
  *
  * @deprecated Use `event.req.headers` instead.
  *
  */
  get headers() {
    return this.req.headers;
  }
  /**
  * Access to the incoming request url (pathname+search).
  *
  * @deprecated Use `event.url.pathname + event.url.search` instead.
  *
  * Example: `/api/hello?name=world`
  * */
  get path() {
    return this.url.pathname + this.url.search;
  }
  /**
  * Access to the incoming request method.
  *
  * @deprecated Use `event.req.method` instead.
  */
  get method() {
    return this.req.method;
  }
};
var H3EventResponse = class {
  status;
  statusText;
  _headers;
  get headers() {
    if (!this._headers) this._headers = new Headers();
    return this._headers;
  }
};
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
function sanitizeStatusMessage(statusMessage = "") {
  return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
  if (!statusCode) return defaultStatusCode;
  if (typeof statusCode === "string") statusCode = +statusCode;
  if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
  return statusCode;
}
var HTTPError = class HTTPError2 extends Error {
  get name() {
    return "HTTPError";
  }
  /**
  * HTTP status code in range [200...599]
  */
  status;
  /**
  * HTTP status text
  *
  * **NOTE:** This should be short (max 512 to 1024 characters).
  * Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
  *
  * **TIP:** Use `message` for longer error descriptions in JSON body.
  */
  statusText;
  /**
  * Additional HTTP headers to be sent in error response.
  */
  headers;
  /**
  * Original error object that caused this error.
  */
  cause;
  /**
  * Additional data attached in the error JSON body under `data` key.
  */
  data;
  /**
  * Additional top level JSON body properties to attach in the error JSON body.
  */
  body;
  /**
  * Flag to indicate that the error was not handled by the application.
  *
  * Unhandled error stack trace, data and message are hidden in non debug mode for security reasons.
  */
  unhandled;
  /**
  * Check if the input is an instance of HTTPError using its constructor name.
  *
  * It is safer than using `instanceof` because it works across different contexts (e.g., if the error was thrown in a different module).
  */
  static isError(input) {
    return input instanceof Error && input?.name === "HTTPError";
  }
  /**
  * Create a new HTTPError with the given status code and optional status text and details.
  *
  * @example
  *
  * HTTPError.status(404)
  * HTTPError.status(418, "I'm a teapot")
  * HTTPError.status(403, "Forbidden", { message: "Not authenticated" })
  */
  static status(status, statusText, details) {
    return new HTTPError2({
      ...details,
      statusText,
      status
    });
  }
  constructor(arg1, arg2) {
    let messageInput;
    let details;
    if (typeof arg1 === "string") {
      messageInput = arg1;
      details = arg2;
    } else details = arg1;
    const status = sanitizeStatusCode(details?.status || details?.cause?.status || details?.status || details?.statusCode, 500);
    const statusText = sanitizeStatusMessage(details?.statusText || details?.cause?.statusText || details?.statusText || details?.statusMessage);
    const message = messageInput || details?.message || details?.cause?.message || details?.statusText || details?.statusMessage || [
      "HTTPError",
      status,
      statusText
    ].filter(Boolean).join(" ");
    super(message, { cause: details });
    this.cause = details;
    Error.captureStackTrace?.(this, this.constructor);
    this.status = status;
    this.statusText = statusText || void 0;
    const rawHeaders = details?.headers || details?.cause?.headers;
    this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
    this.unhandled = details?.unhandled ?? details?.cause?.unhandled ?? void 0;
    this.data = details?.data;
    this.body = details?.body;
  }
  /**
  * @deprecated Use `status`
  */
  get statusCode() {
    return this.status;
  }
  /**
  * @deprecated Use `statusText`
  */
  get statusMessage() {
    return this.statusText;
  }
  toJSON() {
    const unhandled = this.unhandled;
    return {
      status: this.status,
      statusText: this.statusText,
      unhandled,
      message: unhandled ? "HTTPError" : this.message,
      data: unhandled ? void 0 : this.data,
      ...unhandled ? void 0 : this.body
    };
  }
};
function isJSONSerializable(value, _type) {
  if (value === null || value === void 0) return true;
  if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
  if (typeof value.toJSON === "function") return true;
  if (Array.isArray(value)) return true;
  if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
  if (value instanceof NullProtoObj) return true;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
  if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
  const response = prepareResponse(val, event, config);
  if (typeof response?.then === "function") return toResponse(response, event, config);
  const { onResponse: onResponse$1 } = config;
  return onResponse$1 ? Promise.resolve(onResponse$1(response, event)).then(() => response) : response;
}
function prepareResponse(val, event, config, nested) {
  if (val === kHandled) return new NodeResponse(null);
  if (val === kNotFound) val = new HTTPError({
    status: 404,
    message: `Cannot find any route matching [${event.req.method}] ${event.url}`
  });
  if (val && val instanceof Error) {
    const isHTTPError = HTTPError.isError(val);
    const error = isHTTPError ? val : new HTTPError(val);
    if (!isHTTPError) {
      error.unhandled = true;
      if (val?.stack) error.stack = val.stack;
    }
    if (error.unhandled && !config.silent) console.error(error);
    const { onError: onError$1 } = config;
    return onError$1 && !nested ? Promise.resolve(onError$1(error, event)).catch((error$1) => error$1).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
  }
  const eventHeaders = event.res._headers;
  if (!(val instanceof Response)) {
    const res = prepareResponseBody(val, event, config);
    const status = event.res.status;
    return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
      status,
      statusText: event.res.statusText,
      headers: res.headers && eventHeaders ? mergeHeaders$1(res.headers, eventHeaders) : res.headers || eventHeaders
    });
  }
  if (!eventHeaders) return val;
  return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
    status: val.status,
    statusText: val.statusText,
    headers: mergeHeaders$1(eventHeaders, val.headers)
  });
}
function mergeHeaders$1(base, merge) {
  const mergedHeaders = new Headers(base);
  for (const [name, value] of merge) if (name === "set-cookie") mergedHeaders.append(name, value);
  else mergedHeaders.set(name, value);
  return mergedHeaders;
}
const emptyHeaders = /* @__PURE__ */ new Headers({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new Headers({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
  if (val === null || val === void 0) return {
    body: "",
    headers: emptyHeaders
  };
  const valType = typeof val;
  if (valType === "string") return { body: val };
  if (val instanceof Uint8Array) {
    event.res.headers.set("content-length", val.byteLength.toString());
    return { body: val };
  }
  if (isJSONSerializable(val, valType)) return {
    body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
    headers: jsonHeaders
  };
  if (valType === "bigint") return {
    body: val.toString(),
    headers: jsonHeaders
  };
  if (val instanceof Blob) {
    const headers = {
      "content-type": val.type,
      "content-length": val.size.toString()
    };
    let filename = val.name;
    if (filename) {
      filename = encodeURIComponent(filename);
      headers["content-disposition"] = `filename="${filename}"; filename*=UTF-8''${filename}`;
    }
    return {
      body: val.stream(),
      headers
    };
  }
  if (valType === "symbol") return { body: val.toString() };
  if (valType === "function") return { body: `${val.name}()` };
  return { body: val };
}
function nullBody(method, status) {
  return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug) {
  return new NodeResponse(JSON.stringify({
    ...error.toJSON(),
    stack: debug && error.stack ? error.stack.split("\n").map((l2) => l2.trim()) : void 0
  }, void 0, debug ? 2 : void 0), {
    status: error.status,
    statusText: error.statusText,
    headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : jsonHeaders
  });
}
const eventStorage = new AsyncLocalStorage();
function requestHandler(handler) {
  return (request, requestOpts) => {
    const h3Event = new H3Event(request);
    const response = eventStorage.run(
      { h3Event },
      () => handler(request, requestOpts)
    );
    return toResponse(response, h3Event);
  };
}
function getH3Event() {
  const event = eventStorage.getStore();
  if (!event) {
    throw new Error(
      `No StartEvent found in AsyncLocalStorage. Make sure you are using the function within the server runtime.`
    );
  }
  return event.h3Event;
}
function getResponse() {
  const event = getH3Event();
  return event._res;
}
const VIRTUAL_MODULES = {
  startManifest: "tanstack-start-manifest:v",
  serverFnManifest: "tanstack-start-server-fn-manifest:v",
  injectedHeadScripts: "tanstack-start-injected-head-scripts:v"
};
async function loadVirtualModule(id) {
  switch (id) {
    case VIRTUAL_MODULES.startManifest:
      return await import("./_tanstack-start-manifest_v-BdtWjInu.mjs");
    case VIRTUAL_MODULES.serverFnManifest:
      return await import("./_tanstack-start-server-fn-manifest_v-DtgTK7xl.mjs");
    case VIRTUAL_MODULES.injectedHeadScripts:
      return await import("./_tanstack-start-injected-head-scripts_v-cda0Ky0D.mjs");
    default:
      throw new Error(`Unknown virtual module: ${id}`);
  }
}
async function getStartManifest() {
  const { tsrStartManifest } = await loadVirtualModule(
    VIRTUAL_MODULES.startManifest
  );
  const startManifest = tsrStartManifest();
  const rootRoute = startManifest.routes[rootRouteId] = startManifest.routes[rootRouteId] || {};
  rootRoute.assets = rootRoute.assets || [];
  let script = `import('${startManifest.clientEntry}')`;
  rootRoute.assets.push({
    tag: "script",
    attrs: {
      type: "module",
      suppressHydrationWarning: true,
      async: true
    },
    children: script
  });
  const manifest = {
    ...startManifest,
    routes: Object.fromEntries(
      Object.entries(startManifest.routes).map(([k2, v4]) => {
        const { preloads, assets } = v4;
        return [
          k2,
          {
            preloads,
            assets
          }
        ];
      })
    )
  };
  return manifest;
}
var R = ((a) => (a[a.AggregateError = 1] = "AggregateError", a[a.ArrowFunction = 2] = "ArrowFunction", a[a.ErrorPrototypeStack = 4] = "ErrorPrototypeStack", a[a.ObjectAssign = 8] = "ObjectAssign", a[a.BigIntTypedArray = 16] = "BigIntTypedArray", a))(R || {});
function Nr(o2) {
  switch (o2) {
    case '"':
      return '\\"';
    case "\\":
      return "\\\\";
    case `
`:
      return "\\n";
    case "\r":
      return "\\r";
    case "\b":
      return "\\b";
    case "	":
      return "\\t";
    case "\f":
      return "\\f";
    case "<":
      return "\\x3C";
    case "\u2028":
      return "\\u2028";
    case "\u2029":
      return "\\u2029";
    default:
      return;
  }
}
function d(o2) {
  let e = "", r = 0, t;
  for (let n = 0, a = o2.length; n < a; n++) t = Nr(o2[n]), t && (e += o2.slice(r, n) + t, r = n + 1);
  return r === 0 ? e = o2 : e += o2.slice(r), e;
}
function br(o2) {
  switch (o2) {
    case "\\\\":
      return "\\";
    case '\\"':
      return '"';
    case "\\n":
      return `
`;
    case "\\r":
      return "\r";
    case "\\b":
      return "\b";
    case "\\t":
      return "	";
    case "\\f":
      return "\f";
    case "\\x3C":
      return "<";
    case "\\u2028":
      return "\u2028";
    case "\\u2029":
      return "\u2029";
    default:
      return o2;
  }
}
function N(o2) {
  return o2.replace(/(\\\\|\\"|\\n|\\r|\\b|\\t|\\f|\\u2028|\\u2029|\\x3C)/g, br);
}
var O = "__SEROVAL_REFS__";
function f(o2, e) {
  if (!o2) throw e;
}
var Be = /* @__PURE__ */ new Map(), C2 = /* @__PURE__ */ new Map();
function je(o2) {
  return Be.has(o2);
}
function Ar(o2) {
  return C2.has(o2);
}
function Ke(o2) {
  return f(je(o2), new ie3(o2)), Be.get(o2);
}
function Je(o2) {
  return f(Ar(o2), new le(o2)), C2.get(o2);
}
typeof globalThis != "undefined" ? Object.defineProperty(globalThis, O, { value: C2, configurable: true, writable: false, enumerable: false }) : typeof self != "undefined" ? Object.defineProperty(self, O, { value: C2, configurable: true, writable: false, enumerable: false }) : typeof global != "undefined" && Object.defineProperty(global, O, { value: C2, configurable: true, writable: false, enumerable: false });
function Ye(o2, e) {
  for (let r = 0, t = e.length; r < t; r++) {
    let n = e[r];
    o2.has(n) || (o2.add(n), n.extends && Ye(o2, n.extends));
  }
}
function m(o2) {
  if (o2) {
    let e = /* @__PURE__ */ new Set();
    return Ye(e, o2), [...e];
  }
}
var ce = { [Symbol.asyncIterator]: 0, [Symbol.hasInstance]: 1, [Symbol.isConcatSpreadable]: 2, [Symbol.iterator]: 3, [Symbol.match]: 4, [Symbol.matchAll]: 5, [Symbol.replace]: 6, [Symbol.search]: 7, [Symbol.species]: 8, [Symbol.split]: 9, [Symbol.toPrimitive]: 10, [Symbol.toStringTag]: 11, [Symbol.unscopables]: 12 }, Ge = { 0: Symbol.asyncIterator, 1: Symbol.hasInstance, 2: Symbol.isConcatSpreadable, 3: Symbol.iterator, 4: Symbol.match, 5: Symbol.matchAll, 6: Symbol.replace, 7: Symbol.search, 8: Symbol.species, 9: Symbol.split, 10: Symbol.toPrimitive, 11: Symbol.toStringTag, 12: Symbol.unscopables }, He = { 2: true, 3: false, 1: void 0, 0: null, 4: -0, 5: Number.POSITIVE_INFINITY, 6: Number.NEGATIVE_INFINITY, 7: Number.NaN };
var ue = { 0: "Error", 1: "EvalError", 2: "RangeError", 3: "ReferenceError", 4: "SyntaxError", 5: "TypeError", 6: "URIError" }, Ze = { 0: Error, 1: EvalError, 2: RangeError, 3: ReferenceError, 4: SyntaxError, 5: TypeError, 6: URIError }, s2 = void 0;
function u(o2, e, r, t, n, a, i2, l2, c2, p2, h2, X2) {
  return { t: o2, i: e, s: r, l: t, c: n, m: a, p: i2, e: l2, a: c2, f: p2, b: h2, o: X2 };
}
function x(o2) {
  return u(2, s2, o2, s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
var I = x(2), A = x(3), pe = x(1), de = x(0), Xe = x(4), Qe = x(5), er = x(6), rr = x(7);
function me(o2) {
  return o2 instanceof EvalError ? 1 : o2 instanceof RangeError ? 2 : o2 instanceof ReferenceError ? 3 : o2 instanceof SyntaxError ? 4 : o2 instanceof TypeError ? 5 : o2 instanceof URIError ? 6 : 0;
}
function wr(o2) {
  let e = ue[me(o2)];
  return o2.name !== e ? { name: o2.name } : o2.constructor.name !== e ? { name: o2.constructor.name } : {};
}
function j(o2, e) {
  let r = wr(o2), t = Object.getOwnPropertyNames(o2);
  for (let n = 0, a = t.length, i2; n < a; n++) i2 = t[n], i2 !== "name" && i2 !== "message" && (i2 === "stack" ? e & 4 && (r = r || {}, r[i2] = o2[i2]) : (r = r || {}, r[i2] = o2[i2]));
  return r;
}
function fe(o2) {
  return Object.isFrozen(o2) ? 3 : Object.isSealed(o2) ? 2 : Object.isExtensible(o2) ? 0 : 1;
}
function ge(o2) {
  switch (o2) {
    case Number.POSITIVE_INFINITY:
      return Qe;
    case Number.NEGATIVE_INFINITY:
      return er;
  }
  return o2 !== o2 ? rr : Object.is(o2, -0) ? Xe : u(0, s2, o2, s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function w(o2) {
  return u(1, s2, d(o2), s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function Se(o2) {
  return u(3, s2, "" + o2, s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function sr(o2) {
  return u(4, o2, s2, s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function he(o2, e) {
  let r = e.valueOf();
  return u(5, o2, r !== r ? "" : e.toISOString(), s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function ye(o2, e) {
  return u(6, o2, s2, s2, d(e.source), e.flags, s2, s2, s2, s2, s2, s2);
}
function ve(o2, e) {
  let r = new Uint8Array(e), t = r.length, n = new Array(t);
  for (let a = 0; a < t; a++) n[a] = r[a];
  return u(19, o2, n, s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function or(o2, e) {
  return u(17, o2, ce[e], s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function nr(o2, e) {
  return u(18, o2, d(Ke(e)), s2, s2, s2, s2, s2, s2, s2, s2, s2);
}
function _(o2, e, r) {
  return u(25, o2, r, s2, d(e), s2, s2, s2, s2, s2, s2, s2);
}
function Ne(o2, e, r) {
  return u(9, o2, s2, e.length, s2, s2, s2, s2, r, s2, s2, fe(e));
}
function be(o2, e) {
  return u(21, o2, s2, s2, s2, s2, s2, s2, s2, e, s2, s2);
}
function xe(o2, e, r) {
  return u(15, o2, s2, e.length, e.constructor.name, s2, s2, s2, s2, r, e.byteOffset, s2);
}
function Ie(o2, e, r) {
  return u(16, o2, s2, e.length, e.constructor.name, s2, s2, s2, s2, r, e.byteOffset, s2);
}
function Ae(o2, e, r) {
  return u(20, o2, s2, e.byteLength, s2, s2, s2, s2, s2, r, e.byteOffset, s2);
}
function we(o2, e, r) {
  return u(13, o2, me(e), s2, s2, d(e.message), r, s2, s2, s2, s2, s2);
}
function Ee(o2, e, r) {
  return u(14, o2, me(e), s2, s2, d(e.message), r, s2, s2, s2, s2, s2);
}
function Pe(o2, e, r) {
  return u(7, o2, s2, e, s2, s2, s2, s2, r, s2, s2, s2);
}
function M(o2, e) {
  return u(28, s2, s2, s2, s2, s2, s2, s2, [o2, e], s2, s2, s2);
}
function U(o2, e) {
  return u(30, s2, s2, s2, s2, s2, s2, s2, [o2, e], s2, s2, s2);
}
function L(o2, e, r) {
  return u(31, o2, s2, s2, s2, s2, s2, s2, r, e, s2, s2);
}
function Re(o2, e) {
  return u(32, o2, s2, s2, s2, s2, s2, s2, s2, e, s2, s2);
}
function Oe(o2, e) {
  return u(33, o2, s2, s2, s2, s2, s2, s2, s2, e, s2, s2);
}
function Ce2(o2, e) {
  return u(34, o2, s2, s2, s2, s2, s2, s2, s2, e, s2, s2);
}
var { toString: _e } = Object.prototype;
function Er(o2, e) {
  return e instanceof Error ? `Seroval caught an error during the ${o2} process.
  
${e.name}
${e.message}

- For more information, please check the "cause" property of this error.
- If you believe this is an error in Seroval, please submit an issue at https://github.com/lxsmnsyc/seroval/issues/new` : `Seroval caught an error during the ${o2} process.

"${_e.call(e)}"

For more information, please check the "cause" property of this error.`;
}
var ee3 = class extends Error {
  constructor(r, t) {
    super(Er(r, t));
    this.cause = t;
  }
}, E3 = class extends ee3 {
  constructor(e) {
    super("parsing", e);
  }
}, ze = class extends ee3 {
  constructor(e) {
    super("deserialization", e);
  }
}, g3 = class extends Error {
  constructor(r) {
    super(`The value ${_e.call(r)} of type "${typeof r}" cannot be parsed/serialized.
      
There are few workarounds for this problem:
- Transform the value in a way that it can be serialized.
- If the reference is present on multiple runtimes (isomorphic), you can use the Reference API to map the references.`);
    this.value = r;
  }
}, y3 = class extends Error {
  constructor(e) {
    super('Unsupported node type "' + e.t + '".');
  }
}, W3 = class extends Error {
  constructor(e) {
    super('Missing plugin for tag "' + e + '".');
  }
}, P = class extends Error {
  constructor(e) {
    super('Missing "' + e + '" instance.');
  }
}, ie3 = class extends Error {
  constructor(r) {
    super('Missing reference for the value "' + _e.call(r) + '" of type "' + typeof r + '"');
    this.value = r;
  }
}, le = class extends Error {
  constructor(e) {
    super('Missing reference for id "' + d(e) + '"');
  }
}, ke = class extends Error {
  constructor(e) {
    super('Unknown TypedArray "' + e + '"');
  }
};
var T2 = class {
  constructor(e, r) {
    this.value = e;
    this.replacement = r;
  }
};
var ar = {}, ir = {};
var lr = { 0: {}, 1: {}, 2: {}, 3: {}, 4: {} };
function re() {
  let o2, e;
  return { promise: new Promise((r, t) => {
    o2 = r, e = t;
  }), resolve(r) {
    o2(r);
  }, reject(r) {
    e(r);
  } };
}
function Fe(o2) {
  return "__SEROVAL_STREAM__" in o2;
}
function K() {
  let o2 = /* @__PURE__ */ new Set(), e = [], r = true, t = true;
  function n(l2) {
    for (let c2 of o2.keys()) c2.next(l2);
  }
  function a(l2) {
    for (let c2 of o2.keys()) c2.throw(l2);
  }
  function i2(l2) {
    for (let c2 of o2.keys()) c2.return(l2);
  }
  return { __SEROVAL_STREAM__: true, on(l2) {
    r && o2.add(l2);
    for (let c2 = 0, p2 = e.length; c2 < p2; c2++) {
      let h2 = e[c2];
      c2 === p2 - 1 && !r ? t ? l2.return(h2) : l2.throw(h2) : l2.next(h2);
    }
    return () => {
      r && o2.delete(l2);
    };
  }, next(l2) {
    r && (e.push(l2), n(l2));
  }, throw(l2) {
    r && (e.push(l2), a(l2), r = false, t = false, o2.clear());
  }, return(l2) {
    r && (e.push(l2), i2(l2), r = false, t = true, o2.clear());
  } };
}
function Ve(o2) {
  let e = K(), r = o2[Symbol.asyncIterator]();
  async function t() {
    try {
      let n = await r.next();
      n.done ? e.return(n.value) : (e.next(n.value), await t());
    } catch (n) {
      e.throw(n);
    }
  }
  return t().catch(() => {
  }), e;
}
function ur(o2) {
  return () => {
    let e = [], r = [], t = 0, n = -1, a = false;
    function i2() {
      for (let c2 = 0, p2 = r.length; c2 < p2; c2++) r[c2].resolve({ done: true, value: void 0 });
    }
    o2.on({ next(c2) {
      let p2 = r.shift();
      p2 && p2.resolve({ done: false, value: c2 }), e.push(c2);
    }, throw(c2) {
      let p2 = r.shift();
      p2 && p2.reject(c2), i2(), n = e.length, e.push(c2), a = true;
    }, return(c2) {
      let p2 = r.shift();
      p2 && p2.resolve({ done: true, value: c2 }), i2(), n = e.length, e.push(c2);
    } });
    function l2() {
      let c2 = t++, p2 = e[c2];
      if (c2 !== n) return { done: false, value: p2 };
      if (a) throw p2;
      return { done: true, value: p2 };
    }
    return { [Symbol.asyncIterator]() {
      return this;
    }, async next() {
      if (n === -1) {
        let c2 = t++;
        if (c2 >= e.length) {
          let p2 = re();
          return r.push(p2), await p2.promise;
        }
        return { done: false, value: e[c2] };
      }
      return t > n ? { done: true, value: void 0 } : l2();
    } };
  };
}
function J(o2) {
  let e = [], r = -1, t = -1, n = o2[Symbol.iterator]();
  for (; ; ) try {
    let a = n.next();
    if (e.push(a.value), a.done) {
      t = e.length - 1;
      break;
    }
  } catch (a) {
    r = e.length, e.push(a);
  }
  return { v: e, t: r, d: t };
}
function pr(o2) {
  return () => {
    let e = 0;
    return { [Symbol.iterator]() {
      return this;
    }, next() {
      if (e > o2.d) return { done: true, value: s2 };
      let r = e++, t = o2.v[r];
      if (r === o2.t) throw t;
      return { done: r === o2.d, value: t };
    } };
  };
}
async function Me(o2) {
  try {
    return [1, await o2];
  } catch (e) {
    return [0, e];
  }
}
var Y3 = class {
  constructor(e) {
    this.marked = /* @__PURE__ */ new Set();
    this.plugins = e.plugins, this.features = 31 ^ (e.disabledFeatures || 0), this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  markRef(e) {
    this.marked.add(e);
  }
  isMarked(e) {
    return this.marked.has(e);
  }
  createIndex(e) {
    let r = this.refs.size;
    return this.refs.set(e, r), r;
  }
  getIndexedValue(e) {
    let r = this.refs.get(e);
    return r != null ? (this.markRef(r), { type: 1, value: sr(r) }) : { type: 0, value: this.createIndex(e) };
  }
  getReference(e) {
    let r = this.getIndexedValue(e);
    return r.type === 1 ? r : je(e) ? { type: 2, value: nr(r.value, e) } : r;
  }
  parseWellKnownSymbol(e) {
    let r = this.getReference(e);
    return r.type !== 0 ? r.value : (f(e in ce, new g3(e)), or(r.value, e));
  }
  parseSpecialReference(e) {
    let r = this.getIndexedValue(lr[e]);
    return r.type === 1 ? r.value : u(26, r.value, e, s2, s2, s2, s2, s2, s2, s2, s2, s2);
  }
  parseIteratorFactory() {
    let e = this.getIndexedValue(ar);
    return e.type === 1 ? e.value : u(27, e.value, s2, s2, s2, s2, s2, s2, s2, this.parseWellKnownSymbol(Symbol.iterator), s2, s2);
  }
  parseAsyncIteratorFactory() {
    let e = this.getIndexedValue(ir);
    return e.type === 1 ? e.value : u(29, e.value, s2, s2, s2, s2, s2, s2, [this.parseSpecialReference(1), this.parseWellKnownSymbol(Symbol.asyncIterator)], s2, s2, s2);
  }
  createObjectNode(e, r, t, n) {
    return u(t ? 11 : 10, e, s2, s2, s2, s2, n, s2, s2, s2, s2, fe(r));
  }
  createMapNode(e, r, t, n) {
    return u(8, e, s2, s2, s2, s2, s2, { k: r, v: t, s: n }, s2, this.parseSpecialReference(0), s2, s2);
  }
  createPromiseConstructorNode(e, r) {
    return u(22, e, r, s2, s2, s2, s2, s2, s2, this.parseSpecialReference(1), s2, s2);
  }
};
var k = class extends Y3 {
  async parseItems(e) {
    let r = [];
    for (let t = 0, n = e.length; t < n; t++) t in e && (r[t] = await this.parse(e[t]));
    return r;
  }
  async parseArray(e, r) {
    return Ne(e, r, await this.parseItems(r));
  }
  async parseProperties(e) {
    let r = Object.entries(e), t = [], n = [];
    for (let i2 = 0, l2 = r.length; i2 < l2; i2++) t.push(d(r[i2][0])), n.push(await this.parse(r[i2][1]));
    let a = Symbol.iterator;
    return a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(M(this.parseIteratorFactory(), await this.parse(J(e))))), a = Symbol.asyncIterator, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(U(this.parseAsyncIteratorFactory(), await this.parse(Ve(e))))), a = Symbol.toStringTag, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(w(e[a]))), a = Symbol.isConcatSpreadable, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(e[a] ? I : A)), { k: t, v: n, s: t.length };
  }
  async parsePlainObject(e, r, t) {
    return this.createObjectNode(e, r, t, await this.parseProperties(r));
  }
  async parseBoxed(e, r) {
    return be(e, await this.parse(r.valueOf()));
  }
  async parseTypedArray(e, r) {
    return xe(e, r, await this.parse(r.buffer));
  }
  async parseBigIntTypedArray(e, r) {
    return Ie(e, r, await this.parse(r.buffer));
  }
  async parseDataView(e, r) {
    return Ae(e, r, await this.parse(r.buffer));
  }
  async parseError(e, r) {
    let t = j(r, this.features);
    return we(e, r, t ? await this.parseProperties(t) : s2);
  }
  async parseAggregateError(e, r) {
    let t = j(r, this.features);
    return Ee(e, r, t ? await this.parseProperties(t) : s2);
  }
  async parseMap(e, r) {
    let t = [], n = [];
    for (let [a, i2] of r.entries()) t.push(await this.parse(a)), n.push(await this.parse(i2));
    return this.createMapNode(e, t, n, r.size);
  }
  async parseSet(e, r) {
    let t = [];
    for (let n of r.keys()) t.push(await this.parse(n));
    return Pe(e, r.size, t);
  }
  async parsePromise(e, r) {
    let [t, n] = await Me(r);
    return u(12, e, t, s2, s2, s2, s2, s2, s2, await this.parse(n), s2, s2);
  }
  async parsePlugin(e, r) {
    let t = this.plugins;
    if (t) for (let n = 0, a = t.length; n < a; n++) {
      let i2 = t[n];
      if (i2.parse.async && i2.test(r)) return _(e, i2.tag, await i2.parse.async(r, this, { id: e }));
    }
    return s2;
  }
  async parseStream(e, r) {
    return L(e, this.parseSpecialReference(4), await new Promise((t, n) => {
      let a = [], i2 = r.on({ next: (l2) => {
        this.markRef(e), this.parse(l2).then((c2) => {
          a.push(Re(e, c2));
        }, (c2) => {
          n(c2), i2();
        });
      }, throw: (l2) => {
        this.markRef(e), this.parse(l2).then((c2) => {
          a.push(Oe(e, c2)), t(a), i2();
        }, (c2) => {
          n(c2), i2();
        });
      }, return: (l2) => {
        this.markRef(e), this.parse(l2).then((c2) => {
          a.push(Ce2(e, c2)), t(a), i2();
        }, (c2) => {
          n(c2), i2();
        });
      } });
    }));
  }
  async parseObject(e, r) {
    if (Array.isArray(r)) return this.parseArray(e, r);
    if (Fe(r)) return this.parseStream(e, r);
    let t = r.constructor;
    if (t === T2) return this.parse(r.replacement);
    let n = await this.parsePlugin(e, r);
    if (n) return n;
    switch (t) {
      case Object:
        return this.parsePlainObject(e, r, false);
      case s2:
        return this.parsePlainObject(e, r, true);
      case Date:
        return he(e, r);
      case RegExp:
        return ye(e, r);
      case Error:
      case EvalError:
      case RangeError:
      case ReferenceError:
      case SyntaxError:
      case TypeError:
      case URIError:
        return this.parseError(e, r);
      case Number:
      case Boolean:
      case String:
      case BigInt:
        return this.parseBoxed(e, r);
      case ArrayBuffer:
        return ve(e, r);
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Uint8ClampedArray:
      case Float32Array:
      case Float64Array:
        return this.parseTypedArray(e, r);
      case DataView:
        return this.parseDataView(e, r);
      case Map:
        return this.parseMap(e, r);
      case Set:
        return this.parseSet(e, r);
    }
    if (t === Promise || r instanceof Promise) return this.parsePromise(e, r);
    let a = this.features;
    if (a & 16) switch (t) {
      case BigInt64Array:
      case BigUint64Array:
        return this.parseBigIntTypedArray(e, r);
    }
    if (a & 1 && typeof AggregateError != "undefined" && (t === AggregateError || r instanceof AggregateError)) return this.parseAggregateError(e, r);
    if (r instanceof Error) return this.parseError(e, r);
    if (Symbol.iterator in r || Symbol.asyncIterator in r) return this.parsePlainObject(e, r, !!t);
    throw new g3(r);
  }
  async parseFunction(e) {
    let r = this.getReference(e);
    if (r.type !== 0) return r.value;
    let t = await this.parsePlugin(r.value, e);
    if (t) return t;
    throw new g3(e);
  }
  async parse(e) {
    switch (typeof e) {
      case "boolean":
        return e ? I : A;
      case "undefined":
        return pe;
      case "string":
        return w(e);
      case "number":
        return ge(e);
      case "bigint":
        return Se(e);
      case "object": {
        if (e) {
          let r = this.getReference(e);
          return r.type === 0 ? await this.parseObject(r.value, e) : r.value;
        }
        return de;
      }
      case "symbol":
        return this.parseWellKnownSymbol(e);
      case "function":
        return this.parseFunction(e);
      default:
        throw new g3(e);
    }
  }
  async parseTop(e) {
    try {
      return await this.parse(e);
    } catch (r) {
      throw r instanceof E3 ? r : new E3(r);
    }
  }
};
var $ = class extends k {
  constructor() {
    super(...arguments);
    this.mode = "cross";
  }
};
function dr(o2) {
  switch (o2) {
    case "Int8Array":
      return Int8Array;
    case "Int16Array":
      return Int16Array;
    case "Int32Array":
      return Int32Array;
    case "Uint8Array":
      return Uint8Array;
    case "Uint16Array":
      return Uint16Array;
    case "Uint32Array":
      return Uint32Array;
    case "Uint8ClampedArray":
      return Uint8ClampedArray;
    case "Float32Array":
      return Float32Array;
    case "Float64Array":
      return Float64Array;
    case "BigInt64Array":
      return BigInt64Array;
    case "BigUint64Array":
      return BigUint64Array;
    default:
      throw new ke(o2);
  }
}
function mr(o2, e) {
  switch (e) {
    case 3:
      return Object.freeze(o2);
    case 1:
      return Object.preventExtensions(o2);
    case 2:
      return Object.seal(o2);
    default:
      return o2;
  }
}
var F = class {
  constructor(e) {
    this.plugins = e.plugins, this.refs = e.refs || /* @__PURE__ */ new Map();
  }
  deserializeReference(e) {
    return this.assignIndexedValue(e.i, Je(N(e.s)));
  }
  deserializeArray(e) {
    let r = e.l, t = this.assignIndexedValue(e.i, new Array(r)), n;
    for (let a = 0; a < r; a++) n = e.a[a], n && (t[a] = this.deserialize(n));
    return mr(t, e.o), t;
  }
  deserializeProperties(e, r) {
    let t = e.s;
    if (t) {
      let n = e.k, a = e.v;
      for (let i2 = 0, l2; i2 < t; i2++) l2 = n[i2], typeof l2 == "string" ? r[N(l2)] = this.deserialize(a[i2]) : r[this.deserialize(l2)] = this.deserialize(a[i2]);
    }
    return r;
  }
  deserializeObject(e) {
    let r = this.assignIndexedValue(e.i, e.t === 10 ? {} : /* @__PURE__ */ Object.create(null));
    return this.deserializeProperties(e.p, r), mr(r, e.o), r;
  }
  deserializeDate(e) {
    return this.assignIndexedValue(e.i, new Date(e.s));
  }
  deserializeRegExp(e) {
    return this.assignIndexedValue(e.i, new RegExp(N(e.c), e.m));
  }
  deserializeSet(e) {
    let r = this.assignIndexedValue(e.i, /* @__PURE__ */ new Set()), t = e.a;
    for (let n = 0, a = e.l; n < a; n++) r.add(this.deserialize(t[n]));
    return r;
  }
  deserializeMap(e) {
    let r = this.assignIndexedValue(e.i, /* @__PURE__ */ new Map()), t = e.e.k, n = e.e.v;
    for (let a = 0, i2 = e.e.s; a < i2; a++) r.set(this.deserialize(t[a]), this.deserialize(n[a]));
    return r;
  }
  deserializeArrayBuffer(e) {
    let r = new Uint8Array(e.s);
    return this.assignIndexedValue(e.i, r.buffer);
  }
  deserializeTypedArray(e) {
    let r = dr(e.c), t = this.deserialize(e.f);
    return this.assignIndexedValue(e.i, new r(t, e.b, e.l));
  }
  deserializeDataView(e) {
    let r = this.deserialize(e.f);
    return this.assignIndexedValue(e.i, new DataView(r, e.b, e.l));
  }
  deserializeDictionary(e, r) {
    if (e.p) {
      let t = this.deserializeProperties(e.p, {});
      Object.assign(r, t);
    }
    return r;
  }
  deserializeAggregateError(e) {
    let r = this.assignIndexedValue(e.i, new AggregateError([], N(e.m)));
    return this.deserializeDictionary(e, r);
  }
  deserializeError(e) {
    let r = Ze[e.s], t = this.assignIndexedValue(e.i, new r(N(e.m)));
    return this.deserializeDictionary(e, t);
  }
  deserializePromise(e) {
    let r = re(), t = this.assignIndexedValue(e.i, r), n = this.deserialize(e.f);
    return e.s ? r.resolve(n) : r.reject(n), t.promise;
  }
  deserializeBoxed(e) {
    return this.assignIndexedValue(e.i, Object(this.deserialize(e.f)));
  }
  deserializePlugin(e) {
    let r = this.plugins;
    if (r) {
      let t = N(e.c);
      for (let n = 0, a = r.length; n < a; n++) {
        let i2 = r[n];
        if (i2.tag === t) return this.assignIndexedValue(e.i, i2.deserialize(e.s, this, { id: e.i }));
      }
    }
    throw new W3(e.c);
  }
  deserializePromiseConstructor(e) {
    return this.assignIndexedValue(e.i, this.assignIndexedValue(e.s, re()).promise);
  }
  deserializePromiseResolve(e) {
    let r = this.refs.get(e.i);
    f(r, new P("Promise")), r.resolve(this.deserialize(e.a[1]));
  }
  deserializePromiseReject(e) {
    let r = this.refs.get(e.i);
    f(r, new P("Promise")), r.reject(this.deserialize(e.a[1]));
  }
  deserializeIteratorFactoryInstance(e) {
    this.deserialize(e.a[0]);
    let r = this.deserialize(e.a[1]);
    return pr(r);
  }
  deserializeAsyncIteratorFactoryInstance(e) {
    this.deserialize(e.a[0]);
    let r = this.deserialize(e.a[1]);
    return ur(r);
  }
  deserializeStreamConstructor(e) {
    let r = this.assignIndexedValue(e.i, K()), t = e.a.length;
    if (t) for (let n = 0; n < t; n++) this.deserialize(e.a[n]);
    return r;
  }
  deserializeStreamNext(e) {
    let r = this.refs.get(e.i);
    f(r, new P("Stream")), r.next(this.deserialize(e.f));
  }
  deserializeStreamThrow(e) {
    let r = this.refs.get(e.i);
    f(r, new P("Stream")), r.throw(this.deserialize(e.f));
  }
  deserializeStreamReturn(e) {
    let r = this.refs.get(e.i);
    f(r, new P("Stream")), r.return(this.deserialize(e.f));
  }
  deserializeIteratorFactory(e) {
    this.deserialize(e.f);
  }
  deserializeAsyncIteratorFactory(e) {
    this.deserialize(e.a[1]);
  }
  deserializeTop(e) {
    try {
      return this.deserialize(e);
    } catch (r) {
      throw new ze(r);
    }
  }
  deserialize(e) {
    switch (e.t) {
      case 2:
        return He[e.s];
      case 0:
        return e.s;
      case 1:
        return N(e.s);
      case 3:
        return BigInt(e.s);
      case 4:
        return this.refs.get(e.i);
      case 18:
        return this.deserializeReference(e);
      case 9:
        return this.deserializeArray(e);
      case 10:
      case 11:
        return this.deserializeObject(e);
      case 5:
        return this.deserializeDate(e);
      case 6:
        return this.deserializeRegExp(e);
      case 7:
        return this.deserializeSet(e);
      case 8:
        return this.deserializeMap(e);
      case 19:
        return this.deserializeArrayBuffer(e);
      case 16:
      case 15:
        return this.deserializeTypedArray(e);
      case 20:
        return this.deserializeDataView(e);
      case 14:
        return this.deserializeAggregateError(e);
      case 13:
        return this.deserializeError(e);
      case 12:
        return this.deserializePromise(e);
      case 17:
        return Ge[e.s];
      case 21:
        return this.deserializeBoxed(e);
      case 25:
        return this.deserializePlugin(e);
      case 22:
        return this.deserializePromiseConstructor(e);
      case 23:
        return this.deserializePromiseResolve(e);
      case 24:
        return this.deserializePromiseReject(e);
      case 28:
        return this.deserializeIteratorFactoryInstance(e);
      case 30:
        return this.deserializeAsyncIteratorFactoryInstance(e);
      case 31:
        return this.deserializeStreamConstructor(e);
      case 32:
        return this.deserializeStreamNext(e);
      case 33:
        return this.deserializeStreamThrow(e);
      case 34:
        return this.deserializeStreamReturn(e);
      case 27:
        return this.deserializeIteratorFactory(e);
      case 29:
        return this.deserializeAsyncIteratorFactory(e);
      default:
        throw new y3(e);
    }
  }
};
var v3 = class extends Y3 {
  parseItems(e) {
    let r = [];
    for (let t = 0, n = e.length; t < n; t++) t in e && (r[t] = this.parse(e[t]));
    return r;
  }
  parseArray(e, r) {
    return Ne(e, r, this.parseItems(r));
  }
  parseProperties(e) {
    let r = Object.entries(e), t = [], n = [];
    for (let i2 = 0, l2 = r.length; i2 < l2; i2++) t.push(d(r[i2][0])), n.push(this.parse(r[i2][1]));
    let a = Symbol.iterator;
    return a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(M(this.parseIteratorFactory(), this.parse(J(e))))), a = Symbol.asyncIterator, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(U(this.parseAsyncIteratorFactory(), this.parse(K())))), a = Symbol.toStringTag, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(w(e[a]))), a = Symbol.isConcatSpreadable, a in e && (t.push(this.parseWellKnownSymbol(a)), n.push(e[a] ? I : A)), { k: t, v: n, s: t.length };
  }
  parsePlainObject(e, r, t) {
    return this.createObjectNode(e, r, t, this.parseProperties(r));
  }
  parseBoxed(e, r) {
    return be(e, this.parse(r.valueOf()));
  }
  parseTypedArray(e, r) {
    return xe(e, r, this.parse(r.buffer));
  }
  parseBigIntTypedArray(e, r) {
    return Ie(e, r, this.parse(r.buffer));
  }
  parseDataView(e, r) {
    return Ae(e, r, this.parse(r.buffer));
  }
  parseError(e, r) {
    let t = j(r, this.features);
    return we(e, r, t ? this.parseProperties(t) : s2);
  }
  parseAggregateError(e, r) {
    let t = j(r, this.features);
    return Ee(e, r, t ? this.parseProperties(t) : s2);
  }
  parseMap(e, r) {
    let t = [], n = [];
    for (let [a, i2] of r.entries()) t.push(this.parse(a)), n.push(this.parse(i2));
    return this.createMapNode(e, t, n, r.size);
  }
  parseSet(e, r) {
    let t = [];
    for (let n of r.keys()) t.push(this.parse(n));
    return Pe(e, r.size, t);
  }
  parsePlugin(e, r) {
    let t = this.plugins;
    if (t) for (let n = 0, a = t.length; n < a; n++) {
      let i2 = t[n];
      if (i2.parse.sync && i2.test(r)) return _(e, i2.tag, i2.parse.sync(r, this, { id: e }));
    }
  }
  parseStream(e, r) {
    return L(e, this.parseSpecialReference(4), []);
  }
  parsePromise(e, r) {
    return this.createPromiseConstructorNode(e, this.createIndex({}));
  }
  parseObject(e, r) {
    if (Array.isArray(r)) return this.parseArray(e, r);
    if (Fe(r)) return this.parseStream(e, r);
    let t = r.constructor;
    if (t === T2) return this.parse(r.replacement);
    let n = this.parsePlugin(e, r);
    if (n) return n;
    switch (t) {
      case Object:
        return this.parsePlainObject(e, r, false);
      case void 0:
        return this.parsePlainObject(e, r, true);
      case Date:
        return he(e, r);
      case RegExp:
        return ye(e, r);
      case Error:
      case EvalError:
      case RangeError:
      case ReferenceError:
      case SyntaxError:
      case TypeError:
      case URIError:
        return this.parseError(e, r);
      case Number:
      case Boolean:
      case String:
      case BigInt:
        return this.parseBoxed(e, r);
      case ArrayBuffer:
        return ve(e, r);
      case Int8Array:
      case Int16Array:
      case Int32Array:
      case Uint8Array:
      case Uint16Array:
      case Uint32Array:
      case Uint8ClampedArray:
      case Float32Array:
      case Float64Array:
        return this.parseTypedArray(e, r);
      case DataView:
        return this.parseDataView(e, r);
      case Map:
        return this.parseMap(e, r);
      case Set:
        return this.parseSet(e, r);
    }
    if (t === Promise || r instanceof Promise) return this.parsePromise(e, r);
    let a = this.features;
    if (a & 16) switch (t) {
      case BigInt64Array:
      case BigUint64Array:
        return this.parseBigIntTypedArray(e, r);
    }
    if (a & 1 && typeof AggregateError != "undefined" && (t === AggregateError || r instanceof AggregateError)) return this.parseAggregateError(e, r);
    if (r instanceof Error) return this.parseError(e, r);
    if (Symbol.iterator in r || Symbol.asyncIterator in r) return this.parsePlainObject(e, r, !!t);
    throw new g3(r);
  }
  parseFunction(e) {
    let r = this.getReference(e);
    if (r.type !== 0) return r.value;
    let t = this.parsePlugin(r.value, e);
    if (t) return t;
    throw new g3(e);
  }
  parse(e) {
    switch (typeof e) {
      case "boolean":
        return e ? I : A;
      case "undefined":
        return pe;
      case "string":
        return w(e);
      case "number":
        return ge(e);
      case "bigint":
        return Se(e);
      case "object": {
        if (e) {
          let r = this.getReference(e);
          return r.type === 0 ? this.parseObject(r.value, e) : r.value;
        }
        return de;
      }
      case "symbol":
        return this.parseWellKnownSymbol(e);
      case "function":
        return this.parseFunction(e);
      default:
        throw new g3(e);
    }
  }
  parseTop(e) {
    try {
      return this.parse(e);
    } catch (r) {
      throw r instanceof E3 ? r : new E3(r);
    }
  }
};
var oe3 = class extends v3 {
  constructor(r) {
    super(r);
    this.alive = true;
    this.pending = 0;
    this.initial = true;
    this.buffer = [];
    this.onParseCallback = r.onParse, this.onErrorCallback = r.onError, this.onDoneCallback = r.onDone;
  }
  onParseInternal(r, t) {
    try {
      this.onParseCallback(r, t);
    } catch (n) {
      this.onError(n);
    }
  }
  flush() {
    for (let r = 0, t = this.buffer.length; r < t; r++) this.onParseInternal(this.buffer[r], false);
  }
  onParse(r) {
    this.initial ? this.buffer.push(r) : this.onParseInternal(r, false);
  }
  onError(r) {
    if (this.onErrorCallback) this.onErrorCallback(r);
    else throw r;
  }
  onDone() {
    this.onDoneCallback && this.onDoneCallback();
  }
  pushPendingState() {
    this.pending++;
  }
  popPendingState() {
    --this.pending <= 0 && this.onDone();
  }
  parseProperties(r) {
    let t = Object.entries(r), n = [], a = [];
    for (let l2 = 0, c2 = t.length; l2 < c2; l2++) n.push(d(t[l2][0])), a.push(this.parse(t[l2][1]));
    let i2 = Symbol.iterator;
    return i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(M(this.parseIteratorFactory(), this.parse(J(r))))), i2 = Symbol.asyncIterator, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(U(this.parseAsyncIteratorFactory(), this.parse(Ve(r))))), i2 = Symbol.toStringTag, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(w(r[i2]))), i2 = Symbol.isConcatSpreadable, i2 in r && (n.push(this.parseWellKnownSymbol(i2)), a.push(r[i2] ? I : A)), { k: n, v: a, s: n.length };
  }
  handlePromiseSuccess(r, t) {
    let n = this.parseWithError(t);
    n && this.onParse(u(23, r, s2, s2, s2, s2, s2, s2, [this.parseSpecialReference(2), n], s2, s2, s2)), this.popPendingState();
  }
  handlePromiseFailure(r, t) {
    if (this.alive) {
      let n = this.parseWithError(t);
      n && this.onParse(u(24, r, s2, s2, s2, s2, s2, s2, [this.parseSpecialReference(3), n], s2, s2, s2));
    }
    this.popPendingState();
  }
  parsePromise(r, t) {
    let n = this.createIndex({});
    return t.then(this.handlePromiseSuccess.bind(this, n), this.handlePromiseFailure.bind(this, n)), this.pushPendingState(), this.createPromiseConstructorNode(r, n);
  }
  parsePlugin(r, t) {
    let n = this.plugins;
    if (n) for (let a = 0, i2 = n.length; a < i2; a++) {
      let l2 = n[a];
      if (l2.parse.stream && l2.test(t)) return _(r, l2.tag, l2.parse.stream(t, this, { id: r }));
    }
    return s2;
  }
  parseStream(r, t) {
    let n = L(r, this.parseSpecialReference(4), []);
    return this.pushPendingState(), t.on({ next: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Re(r, i2));
      }
    }, throw: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Oe(r, i2));
      }
      this.popPendingState();
    }, return: (a) => {
      if (this.alive) {
        let i2 = this.parseWithError(a);
        i2 && this.onParse(Ce2(r, i2));
      }
      this.popPendingState();
    } }), n;
  }
  parseWithError(r) {
    try {
      return this.parse(r);
    } catch (t) {
      return this.onError(t), s2;
    }
  }
  start(r) {
    let t = this.parseWithError(r);
    t && (this.onParseInternal(t, true), this.initial = false, this.flush(), this.pending <= 0 && this.destroy());
  }
  destroy() {
    this.alive && (this.onDone(), this.alive = false);
  }
  isAlive() {
    return this.alive;
  }
};
var G3 = class extends oe3 {
  constructor() {
    super(...arguments);
    this.mode = "cross";
  }
};
async function go(o2, e = {}) {
  let r = m(e.plugins);
  return await new $({ plugins: r, disabledFeatures: e.disabledFeatures, refs: e.refs }).parseTop(o2);
}
function So(o2, e) {
  let r = m(e.plugins), t = new G3({ plugins: r, refs: e.refs, disabledFeatures: e.disabledFeatures, onParse: e.onParse, onError: e.onError, onDone: e.onDone });
  return t.start(o2), t.destroy.bind(t);
}
var ne = class extends F {
  constructor(r) {
    super(r);
    this.mode = "vanilla";
    this.marked = new Set(r.markedRefs);
  }
  assignIndexedValue(r, t) {
    return this.marked.has(r) && this.refs.set(r, t), t;
  }
};
function Lo(o2, e = {}) {
  let r = m(e.plugins);
  return new ne({ plugins: r, markedRefs: o2.m }).deserializeTop(o2.t);
}
async function getServerFnById(serverFnId) {
  const { default: serverFnManifest } = await loadVirtualModule(
    VIRTUAL_MODULES.serverFnManifest
  );
  const serverFnInfo = serverFnManifest[serverFnId];
  if (!serverFnInfo) {
    console.info("serverFnManifest", serverFnManifest);
    throw new Error("Server function info not found for " + serverFnId);
  }
  const fnModule = await serverFnInfo.importer();
  if (!fnModule) {
    console.info("serverFnInfo", serverFnInfo);
    throw new Error("Server function module not resolved for " + serverFnId);
  }
  const action = fnModule[serverFnInfo.functionName];
  if (!action) {
    console.info("serverFnInfo", serverFnInfo);
    console.info("fnModule", fnModule);
    throw new Error(
      `Server function module export not resolved for serverFn ID: ${serverFnId}`
    );
  }
  return action;
}
let regex = void 0;
const handleServerAction = async ({
  request,
  context
}) => {
  const controller = new AbortController();
  const signal = controller.signal;
  const abort = () => controller.abort();
  request.signal.addEventListener("abort", abort);
  if (regex === void 0) {
    regex = new RegExp(`${"/_serverFn/"}([^/?#]+)`);
  }
  const method = request.method;
  const url = new URL(request.url, "http://localhost:3000");
  const match = url.pathname.match(regex);
  const serverFnId = match ? match[1] : null;
  const search = Object.fromEntries(url.searchParams.entries());
  const isCreateServerFn = "createServerFn" in search;
  if (typeof serverFnId !== "string") {
    throw new Error("Invalid server action param for serverFnId: " + serverFnId);
  }
  const action = await getServerFnById(serverFnId);
  const formDataContentTypes = [
    "multipart/form-data",
    "application/x-www-form-urlencoded"
  ];
  const contentType = request.headers.get("Content-Type");
  const serovalPlugins = getDefaultSerovalPlugins();
  function parsePayload(payload) {
    const parsedPayload = Lo(payload, { plugins: serovalPlugins });
    return parsedPayload;
  }
  const response = await (async () => {
    try {
      let result = await (async () => {
        if (formDataContentTypes.some(
          (type) => contentType && contentType.includes(type)
        )) {
          invariant(
            method.toLowerCase() !== "get",
            "GET requests with FormData payloads are not supported"
          );
          const formData = await request.formData();
          const serializedContext = formData.get(TSS_FORMDATA_CONTEXT);
          formData.delete(TSS_FORMDATA_CONTEXT);
          const params = {
            context,
            data: formData
          };
          if (typeof serializedContext === "string") {
            try {
              const parsedContext = JSON.parse(serializedContext);
              if (typeof parsedContext === "object" && parsedContext) {
                params.context = { ...context, ...parsedContext };
              }
            } catch {
            }
          }
          return await action(params, signal);
        }
        if (method.toLowerCase() === "get") {
          invariant(
            isCreateServerFn,
            "expected GET request to originate from createServerFn"
          );
          let payload = search.payload;
          payload = payload ? parsePayload(JSON.parse(payload)) : payload;
          payload.context = { ...context, ...payload.context };
          return await action(payload, signal);
        }
        if (method.toLowerCase() !== "post") {
          throw new Error("expected POST method");
        }
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("expected application/json content type");
        }
        const jsonPayload = await request.json();
        if (isCreateServerFn) {
          const payload = parsePayload(jsonPayload);
          payload.context = { ...payload.context, ...context };
          return await action(payload, signal);
        }
        return await action(...jsonPayload);
      })();
      if (result.result instanceof Response) {
        result.result.headers.set(X_TSS_RAW_RESPONSE, "true");
        return result.result;
      }
      if (!isCreateServerFn) {
        result = result.result;
        if (result instanceof Response) {
          return result;
        }
      }
      if (isNotFound(result)) {
        return isNotFoundResponse(result);
      }
      const response2 = getResponse();
      let nonStreamingBody = void 0;
      if (result !== void 0) {
        let done = false;
        const callbacks = {
          onParse: (value) => {
            nonStreamingBody = value;
          },
          onDone: () => {
            done = true;
          },
          onError: (error) => {
            throw error;
          }
        };
        So(result, {
          refs: /* @__PURE__ */ new Map(),
          plugins: serovalPlugins,
          onParse(value) {
            callbacks.onParse(value);
          },
          onDone() {
            callbacks.onDone();
          },
          onError: (error) => {
            callbacks.onError(error);
          }
        });
        if (done) {
          return new Response(
            nonStreamingBody ? JSON.stringify(nonStreamingBody) : void 0,
            {
              status: response2?.status,
              statusText: response2?.statusText,
              headers: {
                "Content-Type": "application/json",
                [X_TSS_SERIALIZED]: "true"
              }
            }
          );
        }
        const stream = new ReadableStream({
          start(controller2) {
            callbacks.onParse = (value) => controller2.enqueue(JSON.stringify(value) + "\n");
            callbacks.onDone = () => {
              try {
                controller2.close();
              } catch (error) {
                controller2.error(error);
              }
            };
            callbacks.onError = (error) => controller2.error(error);
            if (nonStreamingBody !== void 0) {
              callbacks.onParse(nonStreamingBody);
            }
          }
        });
        return new Response(stream, {
          status: response2?.status,
          statusText: response2?.statusText,
          headers: {
            "Content-Type": "application/x-ndjson",
            [X_TSS_SERIALIZED]: "true"
          }
        });
      }
      return new Response(void 0, {
        status: response2?.status,
        statusText: response2?.statusText
      });
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      if (isNotFound(error)) {
        return isNotFoundResponse(error);
      }
      console.info();
      console.info("Server Fn Error!");
      console.info();
      console.error(error);
      console.info();
      const serializedError = JSON.stringify(
        await Promise.resolve(
          go(error, {
            refs: /* @__PURE__ */ new Map(),
            plugins: serovalPlugins
          })
        )
      );
      const response2 = getResponse();
      return new Response(serializedError, {
        status: response2?.status ?? 500,
        statusText: response2?.statusText,
        headers: {
          "Content-Type": "application/json",
          [X_TSS_SERIALIZED]: "true"
        }
      });
    }
  })();
  request.signal.removeEventListener("abort", abort);
  return response;
};
function isNotFoundResponse(error) {
  const { headers, ...rest } = error;
  return new Response(JSON.stringify(rest), {
    status: 404,
    headers: {
      "Content-Type": "application/json",
      ...headers || {}
    }
  });
}
const HEADERS = {
  TSS_SHELL: "X-TSS_SHELL"
};
const createServerRpc = (functionId, splitImportFn) => {
  const url = "/_serverFn/" + functionId;
  return Object.assign(splitImportFn, {
    url,
    functionId,
    [TSS_SERVER_FUNCTION]: true
  });
};
const ServerFunctionSerializationAdapter = createSerializationAdapter({
  key: "$TSS/serverfn",
  test: (v4) => {
    if (typeof v4 !== "function") return false;
    if (!(TSS_SERVER_FUNCTION in v4)) return false;
    return !!v4[TSS_SERVER_FUNCTION];
  },
  toSerializable: ({ functionId }) => ({ functionId }),
  fromSerializable: ({ functionId }) => {
    const fn = async (opts, signal) => {
      const serverFn = await getServerFnById(functionId);
      const result = await serverFn(opts ?? {}, signal);
      return result.result;
    };
    return createServerRpc(functionId, fn);
  }
});
function getStartResponseHeaders(opts) {
  const headers = mergeHeaders(
    {
      "Content-Type": "text/html; charset=utf-8"
    },
    ...opts.router.state.matches.map((match) => {
      return match.headers;
    })
  );
  return headers;
}
function createStartHandler(cb) {
  const ROUTER_BASEPATH = "/";
  let startRoutesManifest = null;
  let startEntry = null;
  let routerEntry = null;
  const getEntries = async () => {
    if (routerEntry === null) {
      routerEntry = await import("./router-CborEPUv.mjs").then((n) => n.r);
    }
    if (startEntry === null) {
      startEntry = await import("./start-HYkvq4Ni.mjs");
    }
    return {
      startEntry,
      routerEntry
    };
  };
  const originalFetch = globalThis.fetch;
  const startRequestResolver = async (request, requestOpts) => {
    const origin = getOrigin(request);
    globalThis.fetch = async function(input, init) {
      function resolve(url2, requestOptions) {
        const fetchRequest = new Request(url2, requestOptions);
        return startRequestResolver(fetchRequest, requestOpts);
      }
      if (typeof input === "string" && input.startsWith("/")) {
        const url2 = new URL(input, origin);
        return resolve(url2, init);
      } else if (typeof input === "object" && "url" in input && typeof input.url === "string" && input.url.startsWith("/")) {
        const url2 = new URL(input.url, origin);
        return resolve(url2, init);
      }
      return originalFetch(input, init);
    };
    const url = new URL(request.url);
    const href = url.href.replace(url.origin, "");
    let router = null;
    const getRouter = async () => {
      if (router) return router;
      router = await (await getEntries()).routerEntry.getRouter();
      const isPrerendering = process.env.TSS_PRERENDERING === "true";
      let isShell = process.env.TSS_SHELL === "true";
      if (isPrerendering && !isShell) {
        isShell = request.headers.get(HEADERS.TSS_SHELL) === "true";
      }
      const history = createMemoryHistory({
        initialEntries: [href]
      });
      router.update({
        history,
        isShell,
        isPrerendering,
        origin: router.options.origin ?? origin,
        ...{
          defaultSsr: startOptions.defaultSsr,
          serializationAdapters: [
            ...startOptions.serializationAdapters || [],
            ...router.options.serializationAdapters || []
          ]
        },
        basepath: ROUTER_BASEPATH
      });
      return router;
    };
    const startOptions = await (await getEntries()).startEntry.startInstance?.getOptions() || {};
    startOptions.serializationAdapters = startOptions.serializationAdapters || [];
    startOptions.serializationAdapters.push(ServerFunctionSerializationAdapter);
    const requestHandlerMiddleware = handlerToMiddleware(
      async ({ context }) => {
        const response2 = await runWithStartContext(
          {
            getRouter,
            startOptions,
            contextAfterGlobalMiddlewares: context,
            request
          },
          async () => {
            try {
              if (href.startsWith("/_serverFn/")) {
                return await handleServerAction({
                  request,
                  context: requestOpts?.context
                });
              }
              const executeRouter = async ({
                serverContext
              }) => {
                const requestAcceptHeader = request.headers.get("Accept") || "*/*";
                const splitRequestAcceptHeader = requestAcceptHeader.split(",");
                const supportedMimeTypes = ["*/*", "text/html"];
                const isRouterAcceptSupported = supportedMimeTypes.some(
                  (mimeType) => splitRequestAcceptHeader.some(
                    (acceptedMimeType) => acceptedMimeType.trim().startsWith(mimeType)
                  )
                );
                if (!isRouterAcceptSupported) {
                  return json(
                    {
                      error: "Only HTML requests are supported here"
                    },
                    {
                      status: 500
                    }
                  );
                }
                if (startRoutesManifest === null) {
                  startRoutesManifest = await getStartManifest();
                }
                const router2 = await getRouter();
                attachRouterServerSsrUtils({
                  router: router2,
                  manifest: startRoutesManifest
                });
                router2.update({ additionalContext: { serverContext } });
                await router2.load();
                if (router2.state.redirect) {
                  return router2.state.redirect;
                }
                await router2.serverSsr.dehydrate();
                const responseHeaders = getStartResponseHeaders({ router: router2 });
                const response4 = await cb({
                  request,
                  router: router2,
                  responseHeaders
                });
                return response4;
              };
              const response3 = await handleServerRoutes({
                getRouter,
                request,
                executeRouter
              });
              return response3;
            } catch (err) {
              if (err instanceof Response) {
                return err;
              }
              throw err;
            }
          }
        );
        return response2;
      }
    );
    const flattenedMiddlewares = startOptions.requestMiddleware ? flattenMiddlewares(startOptions.requestMiddleware) : [];
    const middlewares = flattenedMiddlewares.map((d2) => d2.options.server);
    const ctx = await executeMiddleware(
      [...middlewares, requestHandlerMiddleware],
      {
        request,
        context: requestOpts?.context || {}
      }
    );
    const response = ctx.response;
    if (isRedirect(response)) {
      if (isResolvedRedirect(response)) {
        if (request.headers.get("x-tsr-redirect") === "manual") {
          return json(
            {
              ...response.options,
              isSerializedRedirect: true
            },
            {
              headers: response.headers
            }
          );
        }
        return response;
      }
      if (response.options.to && typeof response.options.to === "string" && !response.options.to.startsWith("/")) {
        throw new Error(
          `Server side redirects must use absolute paths via the 'href' or 'to' options. The redirect() method's "to" property accepts an internal path only. Use the "href" property to provide an external URL. Received: ${JSON.stringify(response.options)}`
        );
      }
      if (["params", "search", "hash"].some(
        (d2) => typeof response.options[d2] === "function"
      )) {
        throw new Error(
          `Server side redirects must use static search, params, and hash values and do not support functional values. Received functional values for: ${Object.keys(
            response.options
          ).filter((d2) => typeof response.options[d2] === "function").map((d2) => `"${d2}"`).join(", ")}`
        );
      }
      const router2 = await getRouter();
      const redirect2 = router2.resolveRedirect(response);
      if (request.headers.get("x-tsr-redirect") === "manual") {
        return json(
          {
            ...response.options,
            isSerializedRedirect: true
          },
          {
            headers: response.headers
          }
        );
      }
      return redirect2;
    }
    return response;
  };
  return requestHandler(startRequestResolver);
}
async function handleServerRoutes({
  getRouter,
  request,
  executeRouter
}) {
  const router = await getRouter();
  let url = new URL(request.url);
  url = executeRewriteInput(router.rewrite, url);
  const pathname = url.pathname;
  const { matchedRoutes, foundRoute, routeParams } = router.getMatchedRoutes(
    pathname,
    void 0
  );
  const middlewares = flattenMiddlewares(
    matchedRoutes.flatMap((r) => r.options.server?.middleware).filter(Boolean)
  ).map((d2) => d2.options.server);
  const server2 = foundRoute?.options.server;
  if (server2) {
    if (server2.handlers) {
      const handlers = typeof server2.handlers === "function" ? server2.handlers({
        createHandlers: (d2) => d2
      }) : server2.handlers;
      const requestMethod = request.method.toLowerCase();
      let method = Object.keys(handlers).find(
        (method2) => method2.toLowerCase() === requestMethod
      );
      if (!method) {
        method = Object.keys(handlers).find(
          (method2) => method2.toLowerCase() === "all"
        ) ? "all" : void 0;
      }
      if (method) {
        const handler = handlers[method];
        if (handler) {
          const mayDefer = !!foundRoute.options.component;
          if (typeof handler === "function") {
            middlewares.push(handlerToMiddleware(handler, mayDefer));
          } else {
            const { middleware } = handler;
            if (middleware && middleware.length) {
              middlewares.push(
                ...flattenMiddlewares(middleware).map((d2) => d2.options.server)
              );
            }
            if (handler.handler) {
              middlewares.push(handlerToMiddleware(handler.handler, mayDefer));
            }
          }
        }
      }
    }
  }
  middlewares.push(
    handlerToMiddleware((ctx2) => executeRouter({ serverContext: ctx2.context }))
  );
  const ctx = await executeMiddleware(middlewares, {
    request,
    context: {},
    params: routeParams,
    pathname
  });
  const response = ctx.response;
  return response;
}
function throwRouteHandlerError() {
  throw new Error("Internal Server Error");
}
function throwIfMayNotDefer() {
  throw new Error("Internal Server Error");
}
function handlerToMiddleware(handler, mayDefer = false) {
  if (mayDefer) {
    return handler;
  }
  return async ({ next: _next, ...rest }) => {
    const response = await handler({ ...rest, next: throwIfMayNotDefer });
    if (!response) {
      throwRouteHandlerError();
    }
    return response;
  };
}
function executeMiddleware(middlewares, ctx) {
  let index = -1;
  const next = async (ctx2) => {
    index++;
    const middleware = middlewares[index];
    if (!middleware) return ctx2;
    let result;
    try {
      result = await middleware({
        ...ctx2,
        // Allow the middleware to call the next middleware in the chain
        next: async (nextCtx) => {
          const nextResult = await next({
            ...ctx2,
            ...nextCtx,
            context: {
              ...ctx2.context,
              ...nextCtx?.context || {}
            }
          });
          return Object.assign(ctx2, handleCtxResult(nextResult));
        }
        // Allow the middleware result to extend the return context
      });
    } catch (err) {
      if (isSpecialResponse(err)) {
        result = {
          response: err
        };
      } else {
        throw err;
      }
    }
    return Object.assign(ctx2, handleCtxResult(result));
  };
  return handleCtxResult(next(ctx));
}
function handleCtxResult(result) {
  if (isSpecialResponse(result)) {
    return {
      response: result
    };
  }
  return result;
}
function isSpecialResponse(err) {
  return isResponse(err) || isRedirect(err);
}
function isResponse(response) {
  return response instanceof Response;
}
var fullPattern = " daum[ /]| deusu/|(?:^|[^g])news(?!sapphire)|(?<! (?:channel/|google/))google(?!(app|/google| pixel))|(?<! cu)bots?(?:\\b|_)|(?<!(?:lib))http|(?<![hg]m)score|(?<!cam)scan|24x7|@[a-z][\\w-]+\\.|\\(\\)|\\.com\\b|\\btime/|\\||^<|^[\\w \\.\\-\\(?:\\):%]+(?:/v?\\d+(?:\\.\\d+)?(?:\\.\\d{1,10})*?)?(?:,|$)|^[^ ]{50,}$|^\\d+\\b|^\\w*search\\b|^\\w+/[\\w\\(\\)]*$|^active|^ad muncher|^amaya|^avsdevicesdk/|^azure|^biglotron|^bot|^bw/|^clamav[ /]|^client/|^cobweb/|^custom|^ddg[_-]android|^discourse|^dispatch/\\d|^downcast/|^duckduckgo|^email|^facebook|^getright/|^gozilla/|^hobbit|^hotzonu|^hwcdn/|^igetter/|^jeode/|^jetty/|^jigsaw|^microsoft bits|^movabletype|^mozilla/\\d\\.\\d\\s[\\w\\.-]+$|^mozilla/\\d\\.\\d\\s\\(compatible;?(?:\\s\\w+\\/\\d+\\.\\d+)?\\)$|^navermailapp|^netsurf|^offline|^openai/|^owler|^php|^postman|^python|^rank|^read|^reed|^rest|^rss|^snapchat|^space bison|^svn|^swcd |^taringa|^thumbor/|^track|^w3c|^webbandit/|^webcopier|^wget|^whatsapp|^wordpress|^xenu link sleuth|^yahoo|^yandex|^zdm/\\d|^zoom marketplace/|agent|analyzer|archive|ask jeeves/teoma|audit|bit\\.ly/|bluecoat drtr|browsex|burpcollaborator|capture|catch|check\\b|checker|chrome-lighthouse|chromeframe|classifier|cloudflare|convertify|crawl|cypress/|dareboost|datanyze|dejaclick|detect|dmbrowser|download|evc-batch/|exaleadcloudview|feed|fetcher|firephp|functionize|grab|headless|httrack|hubspot marketing grader|hydra|ibisbrowser|infrawatch|insight|inspect|iplabel|java(?!;)|library|linkcheck|mail\\.ru/|manager|measure|neustar wpm|node|nutch|offbyone|onetrust|optimize|pageburst|pagespeed|parser|perl|phantomjs|pingdom|powermarks|preview|proxy|ptst[ /]\\d|retriever|rexx;|rigor|rss\\b|scrape|server|sogou|sparkler/|speedcurve|spider|splash|statuscake|supercleaner|synapse|synthetic|tools|torrent|transcoder|url|validator|virtuoso|wappalyzer|webglance|webkit2png|whatcms/|xtate/";
var naivePattern = /bot|crawl|http|lighthouse|scan|search|spider/i;
var pattern;
function getPattern() {
  if (pattern instanceof RegExp) {
    return pattern;
  }
  try {
    pattern = new RegExp(fullPattern, "i");
  } catch (error) {
    pattern = naivePattern;
  }
  return pattern;
}
function isbot(userAgent) {
  return Boolean(userAgent) && getPattern().test(userAgent);
}
const renderRouterToStream = async ({
  request,
  router,
  responseHeaders,
  children: children2
}) => {
  const {
    writable,
    readable
  } = new TransformStream();
  const stream = renderToStream(children2, {
    nonce: router.options.ssr?.nonce
  });
  if (isbot(request.headers.get("User-Agent"))) {
    await stream;
  }
  stream.pipeTo(writable);
  const responseStream = transformReadableStreamWithRouter(router, readable);
  return new Response(responseStream, {
    status: router.state.statusCode,
    headers: responseHeaders
  });
};
const defaultStreamHandler = defineHandlerCallback(async ({
  request,
  router,
  responseHeaders
}) => await renderRouterToStream({
  request,
  router,
  responseHeaders,
  children: () => createComponent(StartServer, {
    router
  })
}));
const fetch = createStartHandler(defaultStreamHandler);
const server = {
  // Providing `RequestHandler` from `@tanstack/solid-start/server` is required so that the output types don't import it from `@tanstack/start-server-core`
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  fetch
};
export {
  Dynamic as D,
  HeadContent as H,
  Outlet as O,
  RouterCore as R,
  Scripts as S,
  createComponent as a,
  useRouterState as b,
  createMemo as c,
  useIntersectionObserver as d,
  server as default,
  createSignal as e,
  functionalUpdate as f,
  exactPathTest as g,
  removeTrailingSlash as h,
  invariant as i,
  joinPaths as j,
  deepEqual as k,
  useContext as l,
  mergeProps as m,
  dummyMatchContext as n,
  matchContext as o,
  isModuleNotFoundError as p,
  createResource as q,
  rootRouteId as r,
  splitProps as s,
  trimPathLeft as t,
  useRouter as u,
  ssr as v,
  warning as w,
  escape as x,
  ssrHydrationKey as y
};
