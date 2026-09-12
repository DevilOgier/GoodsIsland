INSERT INTO "PosterTemplate" ("id","key","version","name","rendererKey","defaultConfig","status","createdAt","updatedAt")
VALUES
  (gen_random_uuid(),'polaroid',3,'奶油手账','polaroid','{"palette":"cream","density":"BALANCED","priceStyle":"PRICE_PROMINENT","showNote":true}'::jsonb,'ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'invitation',3,'婚礼请柬','invitation','{"palette":"champagne","density":"INFO_FIRST","priceStyle":"PRICE_PROMINENT","showNote":true}'::jsonb,'ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'gingham',3,'田园格纹','gingham','{"palette":"sage","density":"BALANCED","priceStyle":"PRICE_PROMINENT","showNote":true}'::jsonb,'ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
  (gen_random_uuid(),'resume',3,'收藏简历','resume','{"palette":"paper","density":"INFO_FIRST","priceStyle":"PRICE_NORMAL","showNote":true}'::jsonb,'ACTIVE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("key","version") DO NOTHING;
