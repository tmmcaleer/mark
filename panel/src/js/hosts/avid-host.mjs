export function createAvidHost(options) {
  const config = options || {};
  const mcapi = config.mcapi;
  const MCAPIClient = config.MCAPIClient;

  if (!mcapi) {
    throw new Error("Avid host API is not available");
  }
  if (!MCAPIClient) {
    throw new Error("Avid MCAPI client constructor is not available");
  }

  const client = new MCAPIClient(mcapi.getGatewayServerAddress(), null, null);

  function getMetadata() {
    return {
      accessToken: mcapi.getAccessToken()
    };
  }

  function onExportFileFinished(callback) {
    mcapi.onEvent.connect(function onEvent(eventName, eventData) {
      if (eventName === "ExportFileFinished") {
        callback(eventData);
      }
    });
  }

  function reportError(code, message) {
    mcapi.reportError(code, message);
  }

  return {
    id: "avid",
    name: "Avid Media Composer",
    client,
    getMetadata,
    onExportFileFinished,
    reportError
  };
}
