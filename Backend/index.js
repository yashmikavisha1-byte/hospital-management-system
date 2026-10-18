const apiHandler = require("./api/index.js");

module.exports = async function handler(req, res) {
  return apiHandler(req, res);
};
