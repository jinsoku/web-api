{
  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = nixpkgs.legacyPackages."${system}";
      in
        rec {
          # `nix develop`
          devShell = pkgs.mkShell {
            nativeBuildInputs = with pkgs; [ 
              rustc 
              cargo
              rustfmt
              clippy
              rls
              nodejs
              yarn
              openssl
              pkg-config
            ];
            
            RUST_SRC_PATH = "${pkgs.rust.packages.stable.rustPlatform.rustLibSrc}";
            PKG_CONFIG_PATH  = "${pkgs.openssl.dev}/lib/pkgconfig";
          };
        }
    );
}
