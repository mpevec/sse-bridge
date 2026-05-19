export const SERVICE_NAME = "sse-bridge";
// default base path is "" and NOT "/". Other than that value could be /sse-bridge and similar.
export const BASE_PATH = "";
export const PORT = parseInt(process.env.PORT || "8088", 10);
