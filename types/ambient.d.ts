// Temporary ambient declarations to satisfy TypeScript for three.js + react-three-fiber
// If proper types are resolved, this file can be removed.

declare module "@react-three/fiber" {
  export const Canvas: any;
  export function useFrame(cb: any): void;
  export function useThree(): any;
}

declare module "three" {
  const ThreeDefault: any;
  export = ThreeDefault;
}

// Note: Avoid overriding JSX.IntrinsicElements to prevent losing built-in tags like 'nav'.
// If you need to extend it for 3D elements, prefer module augmentation in the specific file
// or add those typings locally instead of globally replacing the interface.


