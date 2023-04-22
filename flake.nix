{
  description = "A flake for developing this codebase";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let 
        pkgs = nixpkgs.legacyPackages.${system};
      in 
      {
        devShell = pkgs.mkShell {
          packages = with pkgs; [
            hugo
          ];
        };
      }
    );
  
}
