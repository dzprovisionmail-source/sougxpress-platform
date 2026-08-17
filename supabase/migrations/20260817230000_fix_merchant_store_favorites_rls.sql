-- Allow merchants to view customer store favorites (Phase 2 fix)
CREATE POLICY "Merchants can view store favorites" 
ON customer_favorites 
FOR SELECT 
USING (
  target_type = 'store' AND 
  EXISTS (
    SELECT 1 FROM stores 
    WHERE stores.id = customer_favorites.target_id 
    AND stores.merchant_id = auth.uid()
  )
);
