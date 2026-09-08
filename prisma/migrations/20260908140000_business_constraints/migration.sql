ALTER TABLE "Inventory" ADD CONSTRAINT "inventory_nonnegative" CHECK ("currentQuantity">=0 AND "currentCost">=0);
ALTER TABLE "InventoryEvent" ADD CONSTRAINT "event_direction" CHECK (("type"='COST_ADJUSTMENT' AND "quantityDelta"=0) OR ("type"='BUY' AND "quantityDelta">0) OR ("type" IN ('SELL','LOSS') AND "quantityDelta"<0) OR ("type" IN ('GIFT','EXCHANGE','ADJUSTMENT') AND "quantityDelta"<>0));
ALTER TABLE "Purchase" ADD CONSTRAINT "purchase_values" CHECK (quantity>0 AND "unitPrice">=0 AND "domesticShipping">=0 AND "internationalShipping">=0 AND "otherFee">=0 AND "actualCost">=0 AND "productAmount"=quantity*"unitPrice");
ALTER TABLE "Sale" ADD CONSTRAINT "sale_values" CHECK (quantity>0 AND "unitPrice">=0 AND "totalAmount"=quantity*"unitPrice" AND "allocatedActualCost">=0);
ALTER TABLE "SaleListing" ADD CONSTRAINT "listing_values" CHECK (quantity>0 AND "remainingQuantity">=0 AND "remainingQuantity"<=quantity AND "unitPrice">=0);
ALTER TABLE "Wanted" ADD CONSTRAINT "wanted_values" CHECK ("wantedQuantity">0 AND "fulfilledQuantity">=0 AND "fulfilledQuantity"<="wantedQuantity");
CREATE UNIQUE INDEX "one_active_listing" ON "SaleListing" ("inventoryId") WHERE status='ACTIVE';
CREATE UNIQUE INDEX "one_active_wanted" ON "Wanted" ("userId","productId") WHERE status IN ('WANTED','PARTIAL');
