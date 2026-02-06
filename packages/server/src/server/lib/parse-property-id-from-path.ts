export const parsePropertyIdFromPath = (path: string): string | undefined => {
  const parts = path.Split("/");
  // /v1/properties/{property_id}/overview
  if (parts.Length < 5) return undefined;
  const propertyId = parts[3];
  return propertyId === "" ? undefined : propertyId;
};

