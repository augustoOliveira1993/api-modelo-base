import { Request, Response } from 'express';
import { openApiDocument } from './openapiDocument';

const docsHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Backend Base TS API Docs</title>
    <style>
      body {
        color: #17202a;
        font-family: Arial, sans-serif;
        margin: 0;
        padding: 32px;
      }

      main {
        max-width: 920px;
      }

      pre {
        background: #f4f6f8;
        border: 1px solid #d8dee4;
        overflow-x: auto;
        padding: 16px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Backend Base TS API</h1>
      <p>Contrato OpenAPI disponível em <a href="/openapi.json">/openapi.json</a>.</p>
      <p>Use este JSON no Swagger UI, Redoc, Postman ou Insomnia.</p>
      <pre>curl http://localhost:3333/openapi.json</pre>
    </main>
  </body>
</html>`;

export function openApiJsonHandler(_: Request, res: Response): Response {
  return res.json(openApiDocument);
}

export function openApiDocsHandler(_: Request, res: Response): Response {
  return res.type('html').send(docsHtml);
}
