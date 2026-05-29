const upload = require("./upload.js");
const config = require("./config.js");

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

const app = express();

app.use(express.json());

var cors = require("cors");
const corsOptions = {
    origin: config.ORIGIN, // allows requests coming from ORIGIN
    credentials: true, //access-control-allow-credentials:true
    optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(cors()); // Use this after the variable declaration

// Swagger API documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.post("/upload", upload);

// Start the server
const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}.`);
});
