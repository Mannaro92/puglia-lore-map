-- Update system POIs to have required ubicazione_confidenza_id
UPDATE sites 
SET ubicazione_confidenza_id = '1fef52b2-8cf1-4f82-91b3-7fc17257332c'
WHERE (created_by = '00000000-0000-0000-0000-000000000000'::uuid OR created_by IS NULL)
AND ubicazione_confidenza_id IS NULL;