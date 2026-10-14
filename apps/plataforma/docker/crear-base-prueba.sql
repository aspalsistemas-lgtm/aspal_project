-- Base desechable para los tests de integración (npm run test:integracion).
-- Se crea solo la primera vez que arranca el volumen de PostgreSQL; así los
-- tests nunca tocan la base de desarrollo «aspal».
CREATE DATABASE aspal_prueba OWNER aspal;
