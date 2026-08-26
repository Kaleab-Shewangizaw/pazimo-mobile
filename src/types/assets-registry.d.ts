/**
 * `@react-native/assets-registry` ships no types of its own — it's the same
 * package expo-video's own web target reads a bundled asset's URL from.
 */
declare module '@react-native/assets-registry/registry' {
  export type PackagerAsset = {
    __packager_asset: boolean;
    fileSystemLocation: string;
    httpServerLocation: string;
    width?: number;
    height?: number;
    scales: number[];
    hash: string;
    name: string;
    type: string;
  };

  export function getAssetByID(assetId: number): PackagerAsset | undefined;
  export function registerAsset(asset: PackagerAsset): number;
}
