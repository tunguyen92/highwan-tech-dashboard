export const isWarehouseDemoMode = () => {
  const setting = process.env.WMS_DEMO_MODE;
  if (setting !== undefined) return setting === "true";
  return process.env.NODE_ENV === "development" && process.env.MOCK_DB !== "true" && !process.env.MONGODB_URI;
};
