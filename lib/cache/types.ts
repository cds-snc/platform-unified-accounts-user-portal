import defaultFlags from "../flags/default_flag_settings.json";

export const FeatureFlags = Object.keys(defaultFlags).reduce<Record<string, string>>((red, val) => {
  red[val] = val;
  return red;
}, {}) as { readonly [K in keyof typeof defaultFlags]: K };

export type FeatureFlagKeys = keyof typeof FeatureFlags;

export type Flags = {
  [K in FeatureFlagKeys]: boolean;
};

// Utility type to pick only the keys provided in the flags array
export type PickFlags<T extends FeatureFlagKeys[]> = {
  [K in T[number]]: boolean;
};
