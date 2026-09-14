#!/bin/bash
# Проверка индексов в прод-БД FoodOrderHub
docker exec -i foodorderhub-db-1 psql -U foodorderhub -d foodorderhub -t <<'SQL'
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname;
SQL
