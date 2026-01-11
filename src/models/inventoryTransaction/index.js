const mongoose = require("mongoose");
const inventoryTransactionSchema = require("./schema");

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

module.exports = InventoryTransaction;
