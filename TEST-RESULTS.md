# Resultados de pruebas

- Comandos: `npm test -- --coverage` y `npm run typecheck`
- Resultado: correcto (código de salida 0)

## Salida completa de Jest

```text
> ridersapp@1.0.0 test
> jest --runInBand --coverage

PASS src/screens/auth/__tests__/AuthScreens.test.tsx
PASS src/screens/main/__tests__/EventoFormScreen.test.tsx
PASS src/utils/__tests__/eventoNotifications.test.ts
PASS src/utils/__tests__/validations.test.ts
-------------------------|---------|----------|---------|---------|-------------------
File                     | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------------|---------|----------|---------|---------|-------------------
All files                |   50.31 |    51.28 |      75 |   53.62 |                   
 screens/auth            |   30.55 |    35.71 |      60 |   32.63 |                   
  LoginScreen.tsx        |   33.33 |    42.22 |      75 |   35.89 | 42-79,113         
  RegisterScreen.tsx     |   28.57 |    31.34 |      50 |   30.35 | 11,48-129,175     
 utils                   |   92.15 |     90.9 |     100 |     100 |                   
  eventoNotifications.ts |   91.11 |     90.9 |     100 |     100 | 14,16,41-49       
  validations.ts         |     100 |      100 |     100 |     100 |                   
-------------------------|---------|----------|---------|---------|-------------------

Test Suites: 4 passed, 4 total
Tests:       12 passed, 12 total
Snapshots:   0 total
Time:        7.212 s, estimated 9 s
Ran all test suites.
```

## Salida de TypeScript

```text
> ridersapp@1.0.0 typecheck
> tsc --noEmit
```
