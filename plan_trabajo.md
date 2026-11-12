cee88953-e2ee-4bc8-b639-08ac5549925e

[
  {
    "tabla": "bitacoras_rodadas",
    "rls_habilitado": true,
    "rls_forzado": false,
    "anon_puede_leer": true,
    "usuarios_pueden_leer": true
  },
  {
    "tabla": "eventos",
    "rls_habilitado": true,
    "rls_forzado": false,
    "anon_puede_leer": true,
    "usuarios_pueden_leer": true
  },
  {
    "tabla": "historial_checkins",
    "rls_habilitado": true,
    "rls_forzado": false,
    "anon_puede_leer": true,
    "usuarios_pueden_leer": true
  },
  {
    "tabla": "perfiles",
    "rls_habilitado": true,
    "rls_forzado": false,
    "anon_puede_leer": true,
    "usuarios_pueden_leer": true
  },
  {
    "tabla": "rachas_usuario",
    "rls_habilitado": true,
    "rls_forzado": false,
    "anon_puede_leer": true,
    "usuarios_pueden_leer": true
  }
]

[
  {
    "funcion": "procesar_checkin_diario",
    "argumentos": "p_user_id uuid",
    "security_definer": true,
    "configuracion": null,
    "permisos": "{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    "anon_puede_ejecutar": true,
    "usuarios_pueden_ejecutar": true
  },
  {
    "funcion": "registrar_tiempo_uso",
    "argumentos": "p_minutos numeric",
    "security_definer": true,
    "configuracion": null,
    "permisos": "{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}",
    "anon_puede_ejecutar": true,
    "usuarios_pueden_ejecutar": true
  }
]

[
  {
    "zona_servidor": "UTC",
    "hora_servidor": "2026-11-12 20:13:43.992768+00",
    "fecha_servidor": "2026-11-12",
    "hora_ciudad_mexico": "2026-11-12 14:13:43.992768",
    "fecha_ciudad_mexico": "2026-11-12"
  }
]

[
  {
    "table_schema": "public",
    "table_name": "resenas"
  },
  {
    "table_schema": "public",
    "table_name": "resenas_eliminadas"
  }
]


[
  {
    "tabla_historial_migraciones": null
  }
]

Failed to run sql query: ERROR:  42P01: relation "supabase_migrations.schema_migrations" does not exist
LINE 2: from supabase_migrations.schema_migrations
             ^
Note: A limit of 100 was applied to your query. If this was the cause of a syntax error, try selecting "No limit" instead and re-run the query.

yo ejecutaba las consultas manuales


[
  {
    "ultimo_checkin": "2026-11-12",
    "ultimo_comodin_usado": "2026-11-06",
    "ultimo_quiz_en_historial": "2026-11-11",
    "ultimo_comodin_en_historial": null
  }
]

[
  {
    "evento_id": "779a64c3-6e8b-43ed-8243-2263061779b6",
    "fecha": "2026-10-31",
    "estado": "Planeada",
    "completado": false,
    "estado_review": "pendiente",
    "recordar_despues_de": "2026-11-13 01:00:43.129+00",
    "bitacoras_rodada": 0
  },
  {
    "evento_id": "b17cbdbf-a2a0-4a7a-8709-558f92f472a4",
    "fecha": "2026-10-30",
    "estado": "Planeada",
    "completado": false,
    "estado_review": "pendiente",
    "recordar_despues_de": "2026-11-13 01:01:03.405+00",
    "bitacoras_rodada": 0
  }
]