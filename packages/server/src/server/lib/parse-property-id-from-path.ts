export const parsePropertyIdFromPath = (path: string): string | undefined => {
  const parts = path.split("/");
  // /v1/properties/{property_id}/overview
  if (parts.length < 5) return undefined;
  const propertyId = parts[3];
  return propertyId === "" ? undefined : propertyId;
};
