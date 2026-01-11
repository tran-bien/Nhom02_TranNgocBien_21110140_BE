const mongoose = require("mongoose");
const inventoryItemSchema = require("./schema");

const InventoryItem = mongoose.model("InventoryItem", inventoryItemSchema);

module.exports = InventoryItem;
