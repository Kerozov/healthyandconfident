/** Collage with before & after in one image. */
export const TRANSFORMATION_COLLAGE = "/images/13.jpg";

/** Client before/after pairs — filenames match disk: 14-before.jpg, etc. */
export const CLIENT_TRANSFORMATION_PAIRS = [
  {
    before: "/images/14-before.jpg",
    after: "/images/14-after.jpg",
  },
  {
    before: "/images/15-before.jpg",
    after: "/images/15-after.jpg",
  },
] as const;

/** Flat list: before, after, before, after — for grids. */
export const CLIENT_TRANSFORMATION_IMAGES = CLIENT_TRANSFORMATION_PAIRS.flatMap((pair) => [
  pair.before,
  pair.after,
]);

export function isTransformationBeforeImage(src: string): boolean {
  return src.includes("-before");
}
