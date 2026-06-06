export function createHelperClient(options) {
  const config = options || {};
  const getBaseUrl = typeof config.getBaseUrl === "function"
    ? config.getBaseUrl
    : function defaultBaseUrl() {
      return config.baseUrl || "";
    };
  const XhrClass = config.XMLHttpRequestClass || globalThis.XMLHttpRequest;

  function requestJson(method, path, body) {
    if (!XhrClass) {
      return Promise.reject(new Error("XMLHttpRequest is not available in this host"));
    }

    const baseUrl = String(getBaseUrl() || "").replace(/\/+$/, "");
    const requestPath = String(path || "");
    const url = `${baseUrl}${requestPath.startsWith("/") ? "" : "/"}${requestPath}`;
    const xhr = new XhrClass();

    return new Promise(function request(resolve, reject) {
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.onload = function onload() {
        let payload = null;
        try {
          payload = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch (error) {
          reject(new Error(`Invalid helper response from ${url}`));
          return;
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(payload);
          return;
        }

        const message = payload && payload.error && payload.error.message
          ? payload.error.message
          : `Helper request failed with HTTP ${xhr.status}`;
        reject(new Error(message));
      };
      xhr.onerror = function onerror() {
        reject(new Error(`Cannot reach helper at ${baseUrl}`));
      };
      xhr.send(body ? JSON.stringify(body) : undefined);
    });
  }

  return {
    requestJson
  };
}
