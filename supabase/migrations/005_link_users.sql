-- Migration 005: Vincula usuários Supabase Auth aos clientes existentes
UPDATE clients SET auth_user_id = '816a377b-1336-4c10-b4fc-35b675fe4596' WHERE name = 'Lucas';
UPDATE clients SET auth_user_id = '130ccc0c-a130-4536-a845-7f68479aa501' WHERE name = 'Pedro';
UPDATE clients SET auth_user_id = '5d56311f-ca26-448f-bdac-68bc89d231d4' WHERE name = 'Ico';
