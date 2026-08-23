{ lib
, buildNpmPackage
, nodejs_22
, nodejs_24
, makeWrapper
}:

buildNpmPackage (finalAttrs: {
  pname = "lokalboards";
  # Taken from package.json rather than written here, so `npm version` stays the
  # single place a release number is set and the two cannot drift apart.
  version = (lib.importJSON ../package.json).version;

  src = lib.cleanSourceWith {
    src = ../.;
    # Keep the store path free of things the build never reads. `tests/` and
    # `scripts/` are the bulk of it, and both pull the whole demo apparatus in.
    filter = path: type:
      let rel = lib.removePrefix (toString ../. + "/") (toString path);
      in !(lib.hasPrefix "tests/" rel
        || lib.hasPrefix "scripts/" rel
        || lib.hasPrefix "docs/" rel
        || lib.hasPrefix "demo-screenshots/" rel
        || lib.hasPrefix "portfolio-screenshots/" rel
        || lib.hasPrefix ".output/" rel
        || lib.hasPrefix "node_modules/" rel
        || lib.hasPrefix ".git/" rel);
  };

  # `importNpmLock` was the first attempt here, because it needs no hash to keep
  # in sync. It cannot build this lockfile: it caches tarballs but not registry
  # metadata, and npm asks the registry about `minimatch` — `archiver-utils`
  # wants ^9 and `readdir-glob` wants ^5 while the lockfile pins one copy at
  # 10.2.5 — so the install dies with ENOTCACHED. fetchNpmDeps, which is what
  # this hash belongs to, caches the metadata as well.
  #
  # Regenerate after any dependency change: set this to lib.fakeHash, build, and
  # copy the hash the failure prints.
  npmDepsHash = "sha256-20wuFDS/MOeRRysvkOrmLQ9sFBTvmlW2+8PLKgFTSf8=";

  # Built with Node 24 for its npm 11, and *run* on Node 22 (see the wrapper
  # below). package-lock.json is written by npm 11, and npm 10 — which is what
  # nodejs_22 carries — rejects it as out of sync: "Missing: minimatch@5.1.9",
  # "Missing: unplugin@3.3.0", because the two npms disagree about optional
  # peer dependencies. npm then falls back to resolving against the registry,
  # which a sandboxed build has no access to, and dies with ENOTCACHED. The
  # Dockerfile solves the same problem by installing npm 11 over the image's
  # npm 10. Only the build toolchain differs; Nuxt's output is portable JS.
  nodejs = nodejs_24;
  nativeBuildInputs = [ makeWrapper ];

  # `--ignore-scripts`: the postinstall is `nuxt prepare`, which `npm run build`
  # does again anyway, and esbuild's install script would rather fetch its
  # binary than find the one npm already unpacked.
  npmFlags = [ "--ignore-scripts" ];

  # Nuxt phones home on build unless told not to. There is no network in the
  # sandbox, so this is the difference between a clean build and a wait for a
  # connection that cannot happen.
  env.NUXT_TELEMETRY_DISABLED = "1";

  buildPhase = ''
    runHook preBuild
    npm run build
    runHook postBuild
  '';

  # Nuxt's .output is self-contained: the server bundle, its dependencies and
  # the built client assets. Nothing from node_modules is needed at runtime, so
  # only .output goes to the store.
  installPhase = ''
    runHook preInstall

    mkdir -p $out/share/lokalboards
    cp -r .output/* $out/share/lokalboards/

    # Uploads are resolved from the process's working directory
    # (process.cwd() + /public/uploads, in seven places), and the store is
    # read-only — so the wrapper deliberately does NOT set a working directory.
    # Whoever starts it chooses a writable one; the NixOS module points it at
    # /var/lib/lokalboards.
    makeWrapper ${nodejs_22}/bin/node $out/bin/lokalboards \
      --add-flags "$out/share/lokalboards/server/index.mjs" \
      --set-default NODE_ENV production

    runHook postInstall
  '';

  meta = {
    description = "Self-hosted Kanban boards for teams, with realtime updates, SSO and an API";
    homepage = "https://github.com/florian-strasser/LokalBoards";
    license = lib.licenses.mit;
    mainProgram = "lokalboards";
    platforms = lib.platforms.unix;
  };
})
