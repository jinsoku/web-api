#!/usr/bin/env node

// modified version of https://github.com/IronCoreLabs/recrypt-node-binding/blob/main/publish.js

/**
 * @jinsoku/web-api internals compilation script
 * ==============================================
 * + Clean up any existing Rust builds by running `cargo clean`.
 * + Run `cargo update` to make sure all dependencies are available.
 * + Compile rust code into index.node file.
 * + Run unit tests to ensure the library is in good shape for publishing.
 * + Move all expected content into a `dist` directory.
 * + Generate a binary distrubtion in `bin-package`.
 * + Do a dry run of npm publishing via irish-pub or perform an actual publish step if `--publish` option is provided.
 */

const fs = require("fs");
const path = require("path");
const shell = require("shelljs");

//Fail this script if any of these commands fail
shell.set("-e");
//Ensure that our directory is set to the root of the repo
const rootDirectory = path.dirname(process.argv[1]);
shell.cd(rootDirectory);

// Cleanup any previous Rust builds, update deps, and compile
shell.exec("yarn install --ignore-scripts");
shell.exec("yarn clean");
shell.exec("yarn compile");
shell.exec("yarn build");

// As long as rustc's output is consistent, this should be fine
const host = shell
  .exec("rustc -vV")
  .toString()
  .split("\n")
  .find((line) => line.startsWith("host:"))
  .split(" ")[1];
const cargoTarget = process.env.CARGO_BUILD_TARGET;
// Skip running tests with a cross compiled binary, we know they'll fail to run
if (host === cargoTarget || cargoTarget === "" || cargoTarget === undefined) {
  shell.exec("yarn test");
}
shell.mkdir("./publish");

shell.cp(
  ["README.md", "package.json", "LICENSE", ".gitignore", "yarn.lock"],
  "./publish"
);
shell.cp("-r", ["./dist/"], "./publish");

//Add a NPM install script to the package.json that we push to NPM so that when consumers pull it down it
//runs the expected node-pre-gyp step.
const npmPackageJson = require("./publish/package.json");
npmPackageJson.scripts.install = "node-pre-gyp install";
fs.writeFileSync(
  "./publish/package.json",
  JSON.stringify(npmPackageJson, null, 2)
);

//Use a fully qualified path to pre-gyp binary for Windows support
const cwd = shell.pwd().toString();
const replacementArch = process.env.PRE_GYP_ARCH
  ? `--target_arch=${process.env.PRE_GYP_ARCH}`
  : "";
const replacementPlatform = process.env.PRE_GYP_PLATFORM
  ? `--target_platform=${process.env.PRE_GYP_PLATFORM}`
  : "";
shell.exec(
  `${cwd}/node_modules/@mapbox/node-pre-gyp/bin/node-pre-gyp package ${replacementArch} ${replacementPlatform}`
);
var tgz = shell.exec("find ./build -name *.tar.gz");
shell.exec(`cp ${tgz.replace("\n", "")} ./bin-package/`);

/*
shell.pushd("./publish");

var publishCmd = "echo 'Skipping publishing to npm...'";
if (shouldPublish) {
  publishCmd = "npm publish --access public";
  // If we're publishing a branch build or prerelease like "1.2.3-pre.4", use "--tag next".
  if (isPreRelease) {
    publishCmd += " --tag next";
  }
}
shell.exec(publishCmd);
shell.popd();
*/

shell.echo("compile.js COMPLETE");
