BEGIN;

DROP FUNCTION IF EXISTS public.procesar_checkin_diario(uuid);

CREATE FUNCTION public.procesar_checkin_diario(
  p_user_id uuid,
  p_timezone text DEFAULT 'UTC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_hoy date;
  v_racha public.rachas_usuario%ROWTYPE;
  v_dias_transcurridos integer;
  v_racha_nueva integer;
  v_comodines_nuevos integer;
  v_ultimo_comodin date;
  v_comodin_usado_hoy boolean := false;
  v_nuevas_insignias jsonb := '[]'::jsonb;
  v_racha_maxima integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to process a check-in.'
      USING ERRCODE = '28000';
  END IF;

  IF p_user_id IS DISTINCT FROM v_user_id THEN
    RAISE EXCEPTION 'A user can only process their own check-in.'
      USING ERRCODE = '42501';
  END IF;

  IF p_timezone IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM pg_catalog.pg_timezone_names
       WHERE name = p_timezone
     ) THEN
    RAISE EXCEPTION 'The supplied time zone is invalid.'
      USING ERRCODE = '22023';
  END IF;

  v_hoy := (pg_catalog.now() AT TIME ZONE p_timezone)::date;

  INSERT INTO public.rachas_usuario (
    perfil_id,
    racha_actual,
    racha_maxima,
    ultimo_checkin,
    comodines_disponibles
  )
  VALUES (v_user_id, 0, 0, NULL, 1)
  ON CONFLICT (perfil_id) DO NOTHING;

  SELECT *
  INTO v_racha
  FROM public.rachas_usuario
  WHERE perfil_id = v_user_id
  FOR UPDATE;

  IF v_racha.ultimo_checkin = v_hoy THEN
    INSERT INTO public.historial_checkins (perfil_id, fecha, tipo)
    VALUES (v_user_id, v_hoy, 'quiz')
    ON CONFLICT (perfil_id, fecha) DO NOTHING;

    RETURN jsonb_build_object(
      'exito', true,
      'ya_completado_hoy', true,
      'racha_actual', v_racha.racha_actual,
      'racha_maxima', v_racha.racha_maxima,
      'comodines_disponibles', v_racha.comodines_disponibles,
      'comodin_usado_hoy', COALESCE(v_racha.ultimo_comodin_usado = v_hoy - 1, false),
      'fecha_checkin', v_hoy,
      'nuevas_insignias', '[]'::jsonb,
      'mensaje', 'El check-in de hoy ya habia sido completado previamente.'
    );
  END IF;

  IF v_racha.ultimo_checkin IS NULL THEN
    v_dias_transcurridos := 0;
  ELSE
    v_dias_transcurridos := v_hoy - v_racha.ultimo_checkin;
  END IF;

  IF v_dias_transcurridos < 0 THEN
    RAISE EXCEPTION 'The device time zone is behind the last recorded check-in date.'
      USING ERRCODE = '22023';
  END IF;

  v_racha_nueva := v_racha.racha_actual;
  v_comodines_nuevos := v_racha.comodines_disponibles;
  v_ultimo_comodin := v_racha.ultimo_comodin_usado;

  IF v_dias_transcurridos <= 1 THEN
    v_racha_nueva := v_racha_nueva + 1;
  ELSIF v_dias_transcurridos = 2 AND v_comodines_nuevos > 0 THEN
    v_comodines_nuevos := v_comodines_nuevos - 1;
    v_ultimo_comodin := v_hoy - 1;
    v_racha_nueva := v_racha_nueva + 1;
    v_comodin_usado_hoy := true;
  ELSE
    v_racha_nueva := 1;
  END IF;

  IF v_racha_nueva IN (7, 30) AND v_comodines_nuevos < 2 THEN
    v_comodines_nuevos := LEAST(2, v_comodines_nuevos + 1);
  END IF;

  v_racha_maxima := GREATEST(v_racha.racha_maxima, v_racha_nueva);

  UPDATE public.rachas_usuario
  SET racha_actual = v_racha_nueva,
      racha_maxima = v_racha_maxima,
      ultimo_checkin = v_hoy,
      comodines_disponibles = v_comodines_nuevos,
      ultimo_comodin_usado = v_ultimo_comodin,
      updated_at = pg_catalog.now()
  WHERE perfil_id = v_user_id;

  IF v_comodin_usado_hoy THEN
    INSERT INTO public.historial_checkins (perfil_id, fecha, tipo)
    VALUES (v_user_id, v_hoy - 1, 'comodin')
    ON CONFLICT (perfil_id, fecha) DO NOTHING;
  END IF;

  INSERT INTO public.historial_checkins (perfil_id, fecha, tipo)
  VALUES (v_user_id, v_hoy, 'quiz')
  ON CONFLICT (perfil_id, fecha) DO NOTHING;

  WITH nuevas AS (
    INSERT INTO public.usuario_insignias (perfil_id, insignia_id)
    SELECT v_user_id, i.id
    FROM public.insignias i
    WHERE i.racha_requerida <= v_racha_nueva
      AND NOT EXISTS (
        SELECT 1
        FROM public.usuario_insignias ui
        WHERE ui.perfil_id = v_user_id
          AND ui.insignia_id = i.id
      )
    RETURNING insignia_id
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', i.id,
        'nombre', i.nombre,
        'descripcion', i.descripcion,
        'icono', i.icono
      )
    ),
    '[]'::jsonb
  )
  INTO v_nuevas_insignias
  FROM nuevas n
  JOIN public.insignias i ON i.id = n.insignia_id;

  RETURN jsonb_build_object(
    'exito', true,
    'ya_completado_hoy', false,
    'racha_actual', v_racha_nueva,
    'racha_maxima', v_racha_maxima,
    'comodines_disponibles', v_comodines_nuevos,
    'comodin_usado_hoy', v_comodin_usado_hoy,
    'fecha_checkin', v_hoy,
    'nuevas_insignias', v_nuevas_insignias,
    'mensaje', 'Check-in registrado con exito.'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.procesar_checkin_diario(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.procesar_checkin_diario(uuid, text) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.registrar_tiempo_uso(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registrar_tiempo_uso(numeric) TO authenticated, service_role;

DROP POLICY IF EXISTS "Perfiles visibles para todos" ON public.perfiles;
DROP POLICY IF EXISTS "Permitir lectura publica" ON public.perfiles;
CREATE POLICY "RidersMX users can read their own profile"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Lectura publica de rachas" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Actualizar mi propia racha" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Borrar mi propia racha" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Insertar mi propia racha" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Los usuarios pueden actualizar su propia racha" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Los usuarios pueden insertar su propia racha" ON public.rachas_usuario;
DROP POLICY IF EXISTS "Los usuarios pueden ver su propia racha" ON public.rachas_usuario;
CREATE POLICY "RidersMX users can read their own streak"
  ON public.rachas_usuario
  FOR SELECT
  TO authenticated
  USING (auth.uid() = perfil_id);

DROP POLICY IF EXISTS "Lectura publica de historial" ON public.historial_checkins;
DROP POLICY IF EXISTS "Insertar mi propio historial" ON public.historial_checkins;
CREATE POLICY "RidersMX users can read their own check-in history"
  ON public.historial_checkins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = perfil_id);

REVOKE SELECT ON public.perfiles, public.rachas_usuario, public.historial_checkins
  FROM PUBLIC, anon;
GRANT SELECT ON public.perfiles, public.rachas_usuario, public.historial_checkins
  TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.rachas_usuario
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.historial_checkins
  FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON public.perfiles_publicos FROM PUBLIC;
GRANT SELECT ON public.perfiles_publicos TO anon, authenticated;

COMMIT;
