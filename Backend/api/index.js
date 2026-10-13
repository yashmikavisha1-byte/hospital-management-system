const { app, initialize } = require("../index");

let initialization;

module.exports = async (req, res) => {
  try {
    if (!initialization) {
      initialization = initialize().catch((error) => {
        initialization = undefined;
        throw error;
      });
    }

    await initialization;
    return app(req, res);
  } catch (error) {
    console.error("Backend initialization failed:", error);
    if (!res.headersSent) {
      return res.status(500).json({ message: "Service initialization failed" });
    }
  }
};
