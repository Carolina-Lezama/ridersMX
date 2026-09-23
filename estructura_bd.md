# En formato JSON

[
{
"table_name": "diagnosticos",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "diagnosticos",
"column_name": "motocicleta_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "presion_llanta_delantera",
"data_type": "numeric",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "presion_llanta_trasera",
"data_type": "numeric",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "estado_bateria",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "estado_frenos",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "estado_cadena",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "observaciones_generales",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "diagnosticos",
"column_name": "fecha_diagnostico",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "eventos",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "eventos",
"column_name": "perfil_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "fecha",
"data_type": "date",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "titulo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "tipo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "hora",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "descripcion",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "moto_asociada",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "eventos",
"column_name": "completado",
"data_type": "boolean",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "false"
},
{
"table_name": "eventos",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "eventos",
"column_name": "estado",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "'Planeada'::text"
},
{
"table_name": "foro_likes",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "foro_likes",
"column_name": "publicacion_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "foro_likes",
"column_name": "perfil_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "foro_likes",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "foro_publicaciones",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "foro_publicaciones",
"column_name": "perfil_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "foro_publicaciones",
"column_name": "titulo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "foro_publicaciones",
"column_name": "contenido",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "foro_publicaciones",
"column_name": "categoria",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "foro_publicaciones",
"column_name": "imagen_url",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "foro_publicaciones",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "mantenimientos",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "mantenimientos",
"column_name": "motocicleta_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "tipo_servicio",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "fecha_servicio",
"data_type": "date",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "kilometraje_al_servicio",
"data_type": "integer",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "taller_mecanico",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "costo",
"data_type": "numeric",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "notas",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "mantenimientos",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "motocicletas",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "motocicletas",
"column_name": "perfil_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "alias",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "tipo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "marca",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "modelo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "cilindrada",
"data_type": "integer",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "anio",
"data_type": "integer",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "color",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "placas",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "kilometraje_actual",
"data_type": "integer",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "0"
},
{
"table_name": "motocicletas",
"column_name": "tipo_combustible",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "aseguradora",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "numero_poliza",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "motocicletas",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "perfiles",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "username",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "nombre_completo",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "fecha_nacimiento",
"data_type": "date",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "telefono",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "ciudad",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "bio",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "tipo_sangre",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "contacto_emergencia",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "nivel_experiencia",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "avatar_url",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "perfiles",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
},
{
"table_name": "perfiles",
"column_name": "numero_licencia",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": "uuid_generate_v4()"
},
{
"table_name": "resenas",
"column_name": "perfil_id",
"data_type": "uuid",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "entidad_evaluada",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "NO",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "tipo_entidad",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "calificacion",
"data_type": "integer",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "comentario",
"data_type": "text",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": null
},
{
"table_name": "resenas",
"column_name": "created_at",
"data_type": "timestamp with time zone",
"character_maximum_length": null,
"is_nullable": "YES",
"column_default": "timezone('utc'::text, now())"
}
]
