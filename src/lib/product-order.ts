type ReleasableProduct = {
  id: string;
  createdAt: string | Date;
  releaseDate?: string | Date | null;
};

function timeOf(value: string | Date | null | undefined) {
  if (!value) return null;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function compareProductsByReleaseDate(
  left: ReleasableProduct,
  right: ReleasableProduct,
) {
  const leftRelease = timeOf(left.releaseDate);
  const rightRelease = timeOf(right.releaseDate);
  if (leftRelease !== rightRelease) {
    if (leftRelease === null) return 1;
    if (rightRelease === null) return -1;
    return rightRelease - leftRelease;
  }
  const createdDifference = (timeOf(right.createdAt) ?? 0) - (timeOf(left.createdAt) ?? 0);
  return createdDifference || right.id.localeCompare(left.id);
}
