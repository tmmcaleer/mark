const config = require("./config");
const { createApp } = require("./server");

const { app } = createApp({
  config
});

app.listen(config.port, function listen() {
  console.log(`Mark cloud service listening on ${config.appUrl}`);
});
