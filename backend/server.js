const express = require("express");
const { generateChart } = require("./controllers/chartController");

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/generate-chart", generateChart);

const port = Number(process.env.PORT) || 3333;
if (require.main === module) {
  app.listen(port, () => {
    console.log(`GrahaPath API listening on http://127.0.0.1:${port}`);
  });
}

module.exports = { app };
