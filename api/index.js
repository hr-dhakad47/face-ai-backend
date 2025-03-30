const express = require("express");
const cors = require("cors");
const apiRoutes = require("../routes/api");
const { loadModels } = require("../utils/faceUtils");
const serverless = require("serverless-http");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", apiRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

// ✅ Start the server only in local development
if (process.env.NODE_ENV !== "production") {
  loadModels()
    .then(() => {
      const PORT = process.env.PORT || 5000;
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Failed to load models:", err);
      process.exit(1);
    });
}

// ✅ Export for Vercel (no app.listen required)
module.exports = app;
module.exports.handler = serverless(app);
